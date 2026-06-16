# 🎁 Filelist Gift Automation

This project automates the process of logging into **Filelist.io** and navigating to the gift page to extract specific information using **Puppeteer**.

## 📋 Requirements

- **Node.js 18+** and **npm** (only needed to run from source or build installers)
- Works on **Windows**, **macOS**, and **Linux**

> Packaged installers bundle everything (including Chromium) — end users need
> nothing pre-installed.

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
   - Copy the example config and fill in your credentials:
     ```bash
     cp config.example.json config.json
     ```
   - Edit `config.json` with your **Filelist.io** credentials:
     ```json
     [
       {
         "username": "yourUsername",
         "password": "yourPassword"
       }
     ]
     ```
   - Replace `yourUsername` and `yourPassword` with your actual **Filelist.io** credentials. ⚠️ `config.json` is git-ignored so your credentials are never committed — keep it secure and do not share it.
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

### Running without the GUI

```bash
npm run gift        # claim gifts for all configured accounts
npm run test:auth   # test credentials for all configured accounts
```

## 🗂️ Project Structure

```
filelist-getgift/
├── main.js              # Electron main process (runs automation in-process)
├── preload.js           # Electron context bridge
├── index.html           # GUI
├── config.example.json  # Credentials template (copy to config.json)
├── .puppeteerrc.cjs     # Bundles Chromium into the app for packaging
└── src/
    ├── getGift.js       # Gift automation (exports runGift, also runs as CLI)
    ├── testAuth.js      # Login tester (exports testAuth, also runs as CLI)
    └── utils.js         # Shared helpers: paths, OS-aware launch options, config
```

## 📦 Building Installers (Windows / macOS / Linux)

The app runs Puppeteer **inside** the Electron process, so packaged builds do
**not** require Node.js or a system Chrome on the end user's machine — Chromium
is bundled automatically.

```bash
npm install          # also downloads Chromium into .puppeteer-cache
npm run build        # build for the current OS
npm run build:win    # Windows installer (.exe / NSIS)
npm run build:mac    # macOS disk image (.dmg)
npm run build:linux  # Linux AppImage
```

Output appears in `dist/`. Cross-OS builds are most reliable when run on (or in
CI on) each target operating system.

> **Note:** When run as a packaged app, `config.json` and the log files live in
> the per-user app-data directory (writable on every OS), not next to the
> executable. When run from source, they stay in the project root.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
