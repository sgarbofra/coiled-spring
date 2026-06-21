"""
Encryption utilities using Fernet (symmetric encryption from cryptography library).
Used to encrypt sensitive data like API keys before storing in the database.
"""

import os
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

# Note: .env loading is handled in main.py before any imports
# This module assumes environment variables are already loaded


def _get_fernet() -> Fernet:
    """
    Returns a Fernet instance initialized with the ENCRYPTION_KEY from environment.
    Raises ValueError if ENCRYPTION_KEY is not set.
    """
    key = os.environ.get("ENCRYPTION_KEY")
    if not key:
        raise ValueError(
            "ENCRYPTION_KEY environment variable is not set. "
            "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    return Fernet(key.encode())


def encrypt_value(plaintext: Optional[str]) -> Optional[str]:
    """
    Encrypts a plaintext string using Fernet.

    Args:
        plaintext: The string to encrypt, or None

    Returns:
        The encrypted value as a string, or None if input was None/empty
    """
    if not plaintext:
        return None

    fernet = _get_fernet()
    encrypted_bytes = fernet.encrypt(plaintext.encode())
    return encrypted_bytes.decode()


def decrypt_value(ciphertext: Optional[str]) -> Optional[str]:
    """
    Decrypts a Fernet-encrypted string back to plaintext.

    Args:
        ciphertext: The encrypted string, or None

    Returns:
        The decrypted plaintext, or None if input was None/empty

    Raises:
        InvalidToken: If the ciphertext is invalid or was encrypted with a different key
    """
    if not ciphertext:
        return None

    fernet = _get_fernet()
    decrypted_bytes = fernet.decrypt(ciphertext.encode())
    return decrypted_bytes.decode()


def generate_key() -> str:
    """
    Generates a new Fernet encryption key and returns it as a string.
    Use this during initial setup to create a key for ENCRYPTION_KEY environment variable.

    Example:
        >>> from app.core.encryption import generate_key
        >>> print(generate_key())

    Returns:
        A new Fernet key as a string
    """
    return Fernet.generate_key().decode()


def is_encrypted(value: Optional[str]) -> bool:
    """
    Helper to check if a value appears to be already encrypted.
    Attempts to decrypt it — if successful, it was encrypted; otherwise it wasn't.

    Args:
        value: The string to check

    Returns:
        True if the value is encrypted, False otherwise
    """
    if not value:
        return False

    try:
        decrypt_value(value)
        return True
    except (InvalidToken, Exception):
        return False


if __name__ == "__main__":
    # When run directly, generate and print a new key
    print("Generated Fernet key:")
    print(generate_key())
    print("\nAdd this to your .env file:")
    print(f"ENCRYPTION_KEY={generate_key()}")
