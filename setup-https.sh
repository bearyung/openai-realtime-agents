#!/bin/bash

# Install mkcert if not already installed
if ! command -v mkcert &> /dev/null; then
    echo "Installing mkcert..."
    brew install mkcert
fi

# Create certificates directory
mkdir -p certificates

# Install local CA
mkcert -install

# Generate certificate for localhost and IP
mkcert -cert-file certificates/cert.pem -key-file certificates/key.pem localhost 127.0.0.1 192.168.4.26 ::1

echo "Certificates generated successfully!"