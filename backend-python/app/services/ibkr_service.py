"""
IBKR (Interactive Brokers) Service
Gestisce la connessione e il recupero dati da TWS/IB Gateway
"""
import logging
import threading
import time
from datetime import datetime
from typing import Optional, List, Dict
from ibapi.client import EClient
from ibapi.wrapper import EWrapper
from ibapi.contract import Contract
from ibapi.order import Order

logger = logging.getLogger(__name__)


class IBKRWrapper(EWrapper):
    """Wrapper per gestire i callback di IBKR API"""

    def __init__(self):
        super().__init__()
        self.next_valid_order_id = None
        self.connected_event = threading.Event()
        self.option_chain_data = []
        self.option_chain_event = threading.Event()
        self.expirations = []
        self.expirations_event = threading.Event()
        self.underlying_price = None
        self.underlying_price_event = threading.Event()
        self.historical_iv_data = []
        self.historical_iv_event = threading.Event()
        self.contract_details_list = []
        self.contract_details_event = threading.Event()
        self.error_occurred = False
        self.error_message = ""

    def error(self, reqId, errorCode, errorString, advancedOrderRejectJson=""):
        """Gestisce gli errori"""
        logger.error(f"IBKR Error {errorCode}: {errorString} (reqId: {reqId})")
        self.error_occurred = True
        self.error_message = f"{errorCode}: {errorString}"

        # Sblocca tutti gli eventi in caso di errore
        if errorCode in [502, 504]:  # Connessione fallita
            self.connected_event.set()

    def nextValidId(self, orderId: int):
        """Callback quando la connessione è stabilita"""
        self.next_valid_order_id = orderId
        self.connected_event.set()
        logger.info(f"IBKR connected. Next valid order ID: {orderId}")

    def contractDetails(self, reqId: int, contractDetails):
        """Riceve dettagli del contratto (per opzioni)"""
        self.contract_details_list.append(contractDetails)

    def contractDetailsEnd(self, reqId: int):
        """Fine ricezione dettagli contratti"""
        self.contract_details_event.set()

    def tickPrice(self, reqId, tickType, price, attrib):
        """Riceve aggiornamenti prezzi"""
        if tickType == 4:  # Last price
            self.underlying_price = price
            self.underlying_price_event.set()

    def historicalData(self, reqId, bar):
        """Riceve dati storici"""
        self.historical_iv_data.append({
            'date': bar.date,
            'close': bar.close,
            'volume': bar.volume
        })

    def historicalDataEnd(self, reqId, start, end):
        """Fine ricezione dati storici"""
        self.historical_iv_event.set()


class IBKRClient(EClient):
    """Client IBKR"""

    def __init__(self, wrapper):
        super().__init__(wrapper)


class IBKRService:
    """
    Servizio per interagire con Interactive Brokers TWS/IB Gateway
    Implementa pattern singleton per riusare la connessione
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.wrapper = IBKRWrapper()
            self.client = IBKRClient(self.wrapper)
            self.client_thread = None
            self.is_connected_flag = False
            self.initialized = True

    def connect(self, host: str = '127.0.0.1', port: int = 7497, client_id: int = 1) -> bool:
        """
        Connette a TWS/IB Gateway

        Args:
            host: Host IBKR (default: 127.0.0.1)
            port: Porta (7497 per TWS paper, 7496 per TWS live, 4001 per IB Gateway paper)
            client_id: ID client univoco

        Returns:
            True se connesso, False altrimenti
        """
        try:
            if self.is_connected():
                logger.info("IBKR already connected")
                return True

            logger.info(f"Connecting to IBKR at {host}:{port}...")
            self.wrapper.connected_event.clear()
            self.wrapper.error_occurred = False

            self.client.connect(host, port, client_id)

            # Avvia thread per processare i messaggi
            self.client_thread = threading.Thread(target=self.client.run, daemon=True)
            self.client_thread.start()

            # Aspetta connessione (max 10 secondi)
            connected = self.wrapper.connected_event.wait(timeout=10)

            if connected and not self.wrapper.error_occurred:
                self.is_connected_flag = True
                logger.info("IBKR connection established")
                return True
            else:
                error_msg = self.wrapper.error_message or "Connection timeout"
                logger.error(f"IBKR connection failed: {error_msg}")
                self.disconnect()
                return False

        except Exception as e:
            logger.error(f"IBKR connection error: {e}")
            self.disconnect()
            return False

    def disconnect(self):
        """Disconnette da IBKR"""
        try:
            if self.client.isConnected():
                self.client.disconnect()
            self.is_connected_flag = False
            logger.info("IBKR disconnected")
        except Exception as e:
            logger.error(f"Error disconnecting IBKR: {e}")

    def is_connected(self) -> bool:
        """Verifica se la connessione è attiva"""
        return self.is_connected_flag and self.client.isConnected()

    def get_option_chain(self, symbol: str, expiration: str) -> List[Dict]:
        """
        Scarica la catena opzioni per un simbolo e scadenza

        Args:
            symbol: Ticker del sottostante (es: SPY)
            expiration: Data scadenza formato YYYY-MM-DD

        Returns:
            Lista di opzioni con bid, ask, mid, greche, OI, volume
        """
        if not self.is_connected():
            raise Exception("Not connected to IBKR")

        try:
            logger.info(f"Fetching option chain for {symbol} expiring {expiration}")

            # Reset eventi e dati
            self.wrapper.contract_details_list = []
            self.wrapper.contract_details_event.clear()
            self.wrapper.error_occurred = False

            # Crea contratto sottostante
            contract = Contract()
            contract.symbol = symbol
            contract.secType = "OPT"
            contract.exchange = "SMART"
            contract.currency = "USD"
            contract.lastTradeDateOrContractMonth = expiration.replace('-', '')  # YYYYMMDD

            # Richiedi dettagli contratti opzioni
            req_id = 1001
            self.client.reqContractDetails(req_id, contract)

            # Aspetta risposta (max 30 secondi)
            if not self.wrapper.contract_details_event.wait(timeout=30):
                raise Exception("Timeout waiting for option chain data")

            if self.wrapper.error_occurred:
                raise Exception(f"IBKR error: {self.wrapper.error_message}")

            # Processa i contratti ricevuti
            options = []
            for contract_detail in self.wrapper.contract_details_list:
                contract = contract_detail.contract
                options.append({
                    'strike': contract.strike,
                    'right': contract.right,  # 'C' o 'P'
                    'expiration': expiration,
                    'symbol': symbol,
                    'contract_symbol': contract.localSymbol,
                    # Questi dati richiederebbero chiamate aggiuntive per ogni contratto
                    # Per ora restituiamo la struttura base
                    'bid': None,
                    'ask': None,
                    'mid': None,
                    'iv': None,
                    'delta': None,
                    'gamma': None,
                    'vega': None,
                    'theta': None,
                    'open_interest': None,
                    'volume': None
                })

            logger.info(f"Retrieved {len(options)} option contracts")
            return options

        except Exception as e:
            logger.error(f"Error fetching option chain: {e}")
            raise

    def get_expirations(self, symbol: str) -> List[str]:
        """
        Lista delle scadenze disponibili per un simbolo

        Args:
            symbol: Ticker del sottostante

        Returns:
            Lista di date scadenza formato YYYY-MM-DD
        """
        if not self.is_connected():
            raise Exception("Not connected to IBKR")

        try:
            logger.info(f"Fetching expirations for {symbol}")

            # Reset eventi e dati
            self.wrapper.contract_details_list = []
            self.wrapper.contract_details_event.clear()
            self.wrapper.error_occurred = False

            # Crea contratto generico per opzioni
            contract = Contract()
            contract.symbol = symbol
            contract.secType = "OPT"
            contract.exchange = "SMART"
            contract.currency = "USD"

            req_id = 1002
            self.client.reqContractDetails(req_id, contract)

            # Aspetta risposta (max 30 secondi)
            if not self.wrapper.contract_details_event.wait(timeout=30):
                raise Exception("Timeout waiting for expirations")

            if self.wrapper.error_occurred:
                raise Exception(f"IBKR error: {self.wrapper.error_message}")

            # Estrai scadenze uniche
            expirations = set()
            for contract_detail in self.wrapper.contract_details_list:
                exp_str = contract_detail.contract.lastTradeDateOrContractMonth
                # Converti YYYYMMDD a YYYY-MM-DD
                if len(exp_str) == 8:
                    formatted = f"{exp_str[:4]}-{exp_str[4:6]}-{exp_str[6:]}"
                    expirations.add(formatted)

            expirations_list = sorted(list(expirations))
            logger.info(f"Found {len(expirations_list)} expirations")
            return expirations_list

        except Exception as e:
            logger.error(f"Error fetching expirations: {e}")
            raise

    def get_underlying_price(self, symbol: str) -> float:
        """
        Prezzo corrente del sottostante

        Args:
            symbol: Ticker del sottostante

        Returns:
            Prezzo corrente
        """
        if not self.is_connected():
            raise Exception("Not connected to IBKR")

        try:
            logger.info(f"Fetching price for {symbol}")

            # Reset eventi e dati
            self.wrapper.underlying_price = None
            self.wrapper.underlying_price_event.clear()
            self.wrapper.error_occurred = False

            # Crea contratto stock
            contract = Contract()
            contract.symbol = symbol
            contract.secType = "STK"
            contract.exchange = "SMART"
            contract.currency = "USD"

            req_id = 1003
            self.client.reqMktData(req_id, contract, "", False, False, [])

            # Aspetta risposta (max 10 secondi)
            if not self.wrapper.underlying_price_event.wait(timeout=10):
                # Cancella richiesta se timeout
                self.client.cancelMktData(req_id)
                raise Exception("Timeout waiting for price data")

            # Cancella richiesta market data
            self.client.cancelMktData(req_id)

            if self.wrapper.error_occurred:
                raise Exception(f"IBKR error: {self.wrapper.error_message}")

            if self.wrapper.underlying_price is None:
                raise Exception("No price data received")

            logger.info(f"{symbol} price: {self.wrapper.underlying_price}")
            return self.wrapper.underlying_price

        except Exception as e:
            logger.error(f"Error fetching underlying price: {e}")
            raise

    def get_historical_iv(self, symbol: str, days: int = 252) -> List[Dict]:
        """
        Storico IV per calcolo IV Rank

        Args:
            symbol: Ticker del sottostante
            days: Numero di giorni storici (default: 252 = 1 anno)

        Returns:
            Lista di dati storici con date e IV
        """
        if not self.is_connected():
            raise Exception("Not connected to IBKR")

        try:
            logger.info(f"Fetching historical IV for {symbol} ({days} days)")

            # Reset eventi e dati
            self.wrapper.historical_iv_data = []
            self.wrapper.historical_iv_event.clear()
            self.wrapper.error_occurred = False

            # Crea contratto
            contract = Contract()
            contract.symbol = symbol
            contract.secType = "STK"
            contract.exchange = "SMART"
            contract.currency = "USD"

            # Richiedi dati storici
            req_id = 1004
            end_datetime = ""  # usa ora corrente
            duration_str = f"{days} D"
            bar_size = "1 day"
            what_to_show = "OPTION_IMPLIED_VOLATILITY"
            use_rth = 1
            format_date = 1

            self.client.reqHistoricalData(
                req_id, contract, end_datetime, duration_str,
                bar_size, what_to_show, use_rth, format_date, False, []
            )

            # Aspetta risposta (max 30 secondi)
            if not self.wrapper.historical_iv_event.wait(timeout=30):
                self.client.cancelHistoricalData(req_id)
                raise Exception("Timeout waiting for historical IV data")

            if self.wrapper.error_occurred:
                raise Exception(f"IBKR error: {self.wrapper.error_message}")

            logger.info(f"Retrieved {len(self.wrapper.historical_iv_data)} historical IV data points")
            return self.wrapper.historical_iv_data

        except Exception as e:
            logger.error(f"Error fetching historical IV: {e}")
            raise


# Singleton instance
ibkr_service = IBKRService()
