# Filelist Gift Automation

This project automates the process of logging into Filelist.io and navigating to the gift page to extract specific information using Puppeteer.

## Requirements

- Node.js
- npm (Node Package Manager)
- Puppeteer

## Setup

1. **Clone the Repository**

    Clone this repository to your local machine:

    ```bash
    git clone https://github.com/alexmihalascu/filelist-getgift.git
    ```

2. **Navigate to the Project Directory**

    After cloning, move into the project directory:

    ```bash
    cd filelist-getgift
    ```

3. **Install Dependencies**

    Install the required Node modules (including Puppeteer):

    ```bash
    npm install
    ```

4. **Configuration**

    Modify the `config.json` file in the root of the project with your Filelist.io credentials:

    ```json
    [
    {
        "username": "yourUsername",
        "password": "yourPassword"
    }
    ]
    ```

    Replace `yourUsername` and `yourPassword` with your actual Filelist.io credentials. Ensure this file is kept secure and not shared publicly.

    If you have multiple accounts, modify the `config.json` file in the root of the project after example:

    ```json
    [
    {
        "username": "firstUserUsername",
        "password": "firstUserPassword"
    },
    {
        "username": "secondUserUsername",
        "password": "secondUserPassword"
    }
    // Add more users as needed
    ]
    ```

## Usage

To run the script, use the following command:

```bash
node getGift.js
