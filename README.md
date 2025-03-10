# 🎁 Filelist Gift Automation

This project automates the process of logging into **Filelist.io** and navigating to the gift page to extract specific information using **Puppeteer**.

## 📋 Requirements

- **Node.js** and **npm** (Node Package Manager)
- **Puppeteer**

## 🚀 Setup

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

3. **Quick Setup**

   - **Windows**: Run the setup script:
     ```
     setup.bat
     ```
   - **macOS/Linux**: Run the setup script:
     ```
     ./start.sh
     ```

   This will automatically install all dependencies and prepare the environment.

4. **Manual Setup (Alternative)**
   Install the required Node modules, including Puppeteer:

   ```bash
   npm install
   ```

5. **Configuration**
   - Modify the `config.json` file in the root of the project with your **Filelist.io** credentials:
     ```json
     [
       {
         "username": "yourUsername",
         "password": "yourPassword"
       }
     ]
     ```
   - Replace `yourUsername` and `yourPassword` with your actual **Filelist.io** credentials. ⚠️ Ensure this file is kept secure and not shared publicly.
   - **Multiple Accounts**: If you have multiple accounts, you can add them to the `config.json` file as follows:
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

## 🎮 Usage

To run the script, use the following command:

```bash
npm start
```

Alternatively, you can use:

- On Windows: `setup.bat`
- On macOS/Linux: `./start.sh`

The script will log into **Filelist.io**, navigate to the gift page, and extract the specified information.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
