# FlowPlan2 portable for Windows

Run the **Windows portable executable** workflow manually in GitHub Actions and download its `FlowPlan2-windows-x64` artifact. Extract `FlowPlan2.exe` from the artifact and double-click it on a Windows x64 PC. Node.js does not need to be installed on that PC. A browser does need to be installed.

The executable opens `http://127.0.0.1:4175/` in the default browser. Keep its console window open while using FlowPlan2; close the window to stop the local server. If port 4175 is occupied, FlowPlan2 exits with an error. The executable only serves the web files embedded at build time and only listens on the local machine.

Planning data remains in the browser's `localStorage` for that exact address and browser profile. Use the application's JSON export and import to transfer data to another browser or PC. This portable version does not read planning data from a file beside the executable.

To build locally, use Windows x64 with Node.js 26 and run `npm ci` followed by `npm run build:sea`. The result is `dist/FlowPlan2.exe`. Node.js is needed only on the build machine.
