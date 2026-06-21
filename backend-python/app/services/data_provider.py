"""
Data Provider Service
Router che sceglie automaticamente il data source appropriato:
- Piano PRO con broker collegato → IBKR o Tastytrade
- Piano FREE o senza broker → yfinance
"""
import logging
from typing import List, Dict, Optional
from sqlalchemy.orm import Session

from app.models import User
from app.services.ibkr_service import ibkr_service

logger = logging.getLogger(__name__)


def _yf_get_option_chain(symbol: str, expiration: str) -> List[Dict]:
    """
    Ottiene la catena opzioni per una specifica scadenza usando yfinance.

    Args:
        symbol: Ticker del sottostante
        expiration: Data scadenza formato YYYY-MM-DD

    Returns:
        Lista di dict con dati opzioni (calls e puts)
    """
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        chain = ticker.option_chain(expiration)

        # Converti DataFrame in lista di dict
        calls = chain.calls.to_dict('records')
        puts = chain.puts.to_dict('records')

        # Combina calls e puts con il tipo
        results = []
        for call in calls:
            call['option_type'] = 'call'
            results.append(call)
        for put in puts:
            put['option_type'] = 'put'
            results.append(put)

        return results
    except Exception as e:
        logger.error(f"Error fetching option chain from yfinance for {symbol} {expiration}: {e}")
        raise


def _yf_get_underlying_price(symbol: str) -> float:
    """
    Ottiene il prezzo corrente del sottostante usando yfinance.

    Args:
        symbol: Ticker del sottostante

    Returns:
        Prezzo corrente del sottostante
    """
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        price = ticker.fast_info.last_price
        if price and price > 0:
            return float(price)
        else:
            raise ValueError(f"Invalid price for {symbol}: {price}")
    except Exception as e:
        logger.error(f"Error fetching price from yfinance for {symbol}: {e}")
        raise


class DataProvider:
    """
    Router intelligente per data sources
    Sceglie automaticamente tra IBKR e yfinance in base al piano utente
    """

    @staticmethod
    def _should_use_broker(user: User) -> tuple[bool, str]:
        """
        Determina se usare il broker come data source

        Args:
            user: Oggetto User dal database

        Returns:
            (use_broker: bool, broker_name: str)
        """
        # Se non è PRO, usa yfinance
        if not user or user.plan != 'pro':
            logger.info(f"User plan is {user.plan if user else 'unknown'}, using yfinance")
            return False, "yfinance"

        # Se è PRO ma non ha broker configurato, usa yfinance
        if not user.broker:
            logger.info("User is PRO but no broker configured, using yfinance")
            return False, "yfinance"

        # Se ha broker IBKR configurato, verifica connessione
        if user.broker.lower() == 'ibkr':
            if ibkr_service.is_connected():
                logger.info("Using IBKR as data source (PRO user with active connection)")
                return True, "ibkr"
            else:
                logger.warning("IBKR configured but not connected, falling back to yfinance")
                return False, "yfinance"

        # Altri broker (Tastytrade, ecc.) non ancora implementati
        logger.info(f"Broker {user.broker} not implemented yet, using yfinance")
        return False, "yfinance"

    @staticmethod
    def get_option_chain(
        symbol: str,
        expiration: str,
        user: User
    ) -> List[Dict]:
        """
        Scarica la catena opzioni dal data source appropriato

        Args:
            symbol: Ticker del sottostante
            expiration: Data scadenza formato YYYY-MM-DD
            user: Oggetto User dal database

        Returns:
            Lista di opzioni con bid, ask, mid, greche, OI, volume
        """
        use_broker, broker_name = DataProvider._should_use_broker(user)

        try:
            if use_broker and broker_name == 'ibkr':
                logger.info(f"Fetching option chain from IBKR: {symbol} {expiration}")
                return ibkr_service.get_option_chain(symbol, expiration)
            else:
                logger.info(f"Fetching option chain from yfinance: {symbol} {expiration}")
                return _yf_get_option_chain(symbol, expiration)

        except Exception as e:
            logger.error(f"Error fetching option chain from {broker_name}: {e}")

            # Fallback automatico a yfinance se il broker fallisce
            if use_broker:
                logger.info("Falling back to yfinance after broker error")
                try:
                    return _yf_get_option_chain(symbol, expiration)
                except Exception as fallback_error:
                    logger.error(f"Fallback to yfinance also failed: {fallback_error}")
                    raise
            else:
                raise

    @staticmethod
    def get_underlying_price(symbol: str, user: User) -> float:
        """
        Ottiene il prezzo corrente del sottostante

        Args:
            symbol: Ticker del sottostante
            user: Oggetto User dal database

        Returns:
            Prezzo corrente
        """
        use_broker, broker_name = DataProvider._should_use_broker(user)

        try:
            if use_broker and broker_name == 'ibkr':
                logger.info(f"Fetching price from IBKR: {symbol}")
                return ibkr_service.get_underlying_price(symbol)
            else:
                logger.info(f"Fetching price from yfinance: {symbol}")
                return _yf_get_underlying_price(symbol)

        except Exception as e:
            logger.error(f"Error fetching price from {broker_name}: {e}")

            # Fallback automatico a yfinance se il broker fallisce
            if use_broker:
                logger.info("Falling back to yfinance after broker error")
                try:
                    return _yf_get_underlying_price(symbol)
                except Exception as fallback_error:
                    logger.error(f"Fallback to yfinance also failed: {fallback_error}")
                    raise
            else:
                raise

    @staticmethod
    def get_expirations(symbol: str, user: User) -> List[str]:
        """
        Lista delle scadenze disponibili

        Args:
            symbol: Ticker del sottostante
            user: Oggetto User dal database

        Returns:
            Lista di date scadenza formato YYYY-MM-DD
        """
        use_broker, broker_name = DataProvider._should_use_broker(user)

        try:
            if use_broker and broker_name == 'ibkr':
                logger.info(f"Fetching expirations from IBKR: {symbol}")
                return ibkr_service.get_expirations(symbol)
            else:
                # yfinance: usa ticker.options
                logger.info(f"Fetching expirations from yfinance: {symbol}")
                import yfinance as yf
                ticker = yf.Ticker(symbol)
                return list(ticker.options)

        except Exception as e:
            logger.error(f"Error fetching expirations from {broker_name}: {e}")

            # Fallback automatico a yfinance se il broker fallisce
            if use_broker:
                logger.info("Falling back to yfinance after broker error")
                try:
                    import yfinance as yf
                    ticker = yf.Ticker(symbol)
                    return list(ticker.options)
                except Exception as fallback_error:
                    logger.error(f"Fallback to yfinance also failed: {fallback_error}")
                    raise
            else:
                raise

    @staticmethod
    def get_data_source_status(user: User) -> Dict:
        """
        Restituisce lo stato del data source corrente

        Args:
            user: Oggetto User dal database

        Returns:
            Dict con info sul data source attivo
        """
        use_broker, broker_name = DataProvider._should_use_broker(user)

        return {
            'data_source': broker_name,
            'is_broker': use_broker,
            'connected': ibkr_service.is_connected() if broker_name == 'ibkr' else None,
            'plan': user.plan if user else 'unknown',
            'broker_configured': user.broker if user else None
        }


# Instance singleton
data_provider = DataProvider()
