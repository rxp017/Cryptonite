from Crypto.Cipher import AES
from Crypto.Util.Padding import pad


LEDGER_KEY = bytes.fromhex("00112233445566778899aabbccddeeff")
FIXED_IV = bytes(16)


def encrypt_ledger_row(row: bytes) -> bytes:
    cipher = AES.new(LEDGER_KEY, AES.MODE_CBC, iv=FIXED_IV)
    return cipher.encrypt(pad(row, AES.block_size))
