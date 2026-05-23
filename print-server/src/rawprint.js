const { execSync } = require("child_process");
const fs   = require("fs");
const path = require("path");
const os   = require("os");

const PS_CODE = String.raw`
Add-Type -Language CSharp -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
}

public class RawPrint {
    [DllImport("winspool.Drv", SetLastError=true, CharSet=CharSet.Ansi)]
    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
    [DllImport("winspool.Drv", SetLastError=true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", SetLastError=true)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
    [DllImport("winspool.Drv", SetLastError=true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", SetLastError=true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", SetLastError=true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", SetLastError=true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool Send(string printerName, byte[] bytes) {
        IntPtr hPrinter;
        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) return false;
        var di = new DOCINFOA { pDocName = "OchelReceipt", pDataType = "RAW" };
        if (!StartDocPrinter(hPrinter, 1, di)) { ClosePrinter(hPrinter); return false; }
        StartPagePrinter(hPrinter);
        IntPtr ptr = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, ptr, bytes.Length);
        int written;
        bool ok = WritePrinter(hPrinter, ptr, bytes.Length, out written);
        Marshal.FreeCoTaskMem(ptr);
        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);
        return ok;
    }
}
"@
`;

function printBuffer(printerName, buf) {
  const tmpBin = path.join(os.tmpdir(), `ochel_${Date.now()}.bin`);
  const tmpPs  = path.join(os.tmpdir(), `ochel_${Date.now()}.ps1`);

  const escapedBin     = tmpBin.replace(/\\/g, "\\\\");
  const escapedPrinter = printerName.replace(/'/g, "''");

  const script = `${PS_CODE}
$bytes = [System.IO.File]::ReadAllBytes('${escapedBin}')
$ok = [RawPrint]::Send('${escapedPrinter}', $bytes)
if ($ok) { Write-Output "PRINT_OK" } else { Write-Output "PRINT_FAIL"; exit 1 }
`;

  try {
    fs.writeFileSync(tmpBin, buf);
    fs.writeFileSync(tmpPs, script, "utf8");
    const out = execSync(
      `powershell -ExecutionPolicy Bypass -NonInteractive -File "${tmpPs}"`,
      { encoding: "utf8", timeout: 20000 }
    );
    return out.trim().includes("PRINT_OK");
  } finally {
    try { fs.unlinkSync(tmpBin); } catch {}
    try { fs.unlinkSync(tmpPs);  } catch {}
  }
}

module.exports = { printBuffer };
