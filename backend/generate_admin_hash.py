#!/usr/bin/env python3
"""
Admin Password Hash Generator
Use this script to generate bcrypt hashes for admin passwords
"""

import bcrypt
import sys

def generate_hash(password):
    """Generate a bcrypt hash for a password"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

if __name__ == "__main__":
    if len(sys.argv) > 1:
        password = sys.argv[1]
    else:
        password = input("Enter password to hash: ")
    
    hash_value = generate_hash(password)
    print(f"\nPassword: {password}")
    print(f"Hash: {hash_value}")
    print(f"\nUse this hash in your SQL INSERT statement for the admins table")
