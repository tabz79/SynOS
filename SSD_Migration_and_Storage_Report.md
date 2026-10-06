# SSD Migration & Storage Analysis Report (Refined Assessment)

## 1. Real Usable Capacity of the 256 GB SSD

Storage manufacturers label drives using decimal gigabytes ($1\text{ GB} = 10^9\text{ bytes}$), whereas Windows calculates storage in binary gibibytes ($1\text{ GiB} = 1024^3\text{ bytes}$).

* **Advertised Capacity:** 256 GB
* **Raw Binary Capacity:** $\approx 238.4\text{ GiB}$
* **Actual Formatted NTFS Usable Capacity:** **`223.57 GB`** *(as verified on Drive D:)*

---

## 2. Updated Storage Audit & What Can Be Cleared

### A. Items to Delete / Safe to Clear (~35–40 GB Reclaim)
1. **`Downloads` Folder:** **`17.06 GB`** $\rightarrow$ Move essentials to cloud/Mac, then empty.
2. **Android SDK / Tooling:** **`~7.88 GB`**
   * `C:\Users\Asus\.android`: `3.85 GB`
   * `C:\Users\Asus\AppData\Local\Android`: `4.03 GB`
3. **Safe Developer Caches (Does NOT hurt SynOS or active projects):**
   * `npm-cache`: **`5.48 GB`** (Run: `npm cache clean --force`)
   * `pnpm` / `hermes` build caches: **`~4.05 GB`**
   * `.nuget` cache: **`2.14 GB`** (Run: `dotnet nuget locals all --clear`)
   * `.gradle` build cache: **`1.77 GB`**
4. **Temporary Files & Recycle Bin:** **`~5.47 GB`**
   * `AppData\Local\Temp`: `4.42 GB`
   * `$Recycle.Bin`: `1.05 GB`

---

### B. STRICTLY PROTECTED Items (DO NOT TOUCH)
* **Antigravity Brain & Conversations (`C:\Users\Asus\.gemini`):** **`6.82 GB`**
  * *Reason:* Contains all chat histories, project memories, custom rules, learned skills, and conversation transcripts. 100% safe to leave untouched.
* **Roaming App Configurations (`AppData\Roaming\Antigravity`, `Code`, `Cursor`):** **`< 1.0 GB`**
* **Active Project Repositories & Databases (`C:\SynOS_Files`, `C:\src`, `d:\Projects`):** Intact.

---

## 3. Post-Cleanup Fit Assessment

| Component | Estimated Size |
| :--- | :--- |
| **Windows 11 OS Base** | ~38.3 GB |
| **Program Files & Tools (VS, SQL Server, Runtimes)** | ~51.6 GB |
| **User Profile (AppData cleaned, personal configs)** | ~34.0 GB |
| **Antigravity Brain (`.gemini`)** | ~6.8 GB |
| **System Pagefile & Hibernate (`hiberfil` + `pagefile`)** | ~11.2 GB |
| **SynOS Masters & Working Directories** | ~8.0 GB |
| **Total Estimated Footprint on Target Drive** | **~150 – 155 GB** |

### Capacity Headroom:
$$\text{223.57 GB (Capacity)} - \text{155 GB (OS + Dev Footprint)} = \mathbf{68.57\text{ GB Free Space}}\;(\approx 30\%\text{ Free Headroom})$$

> [!NOTE]
> Having **~68 GB (30%) of free space** on a 256 GB SSD is ideal for Windows 11 updates, virtual memory, and SSD health (TRIM wear leveling).

---

## 4. Quick Cleanup Execution Commands

Run these commands in PowerShell / Terminal to safely purge the caches:

```powershell
# 1. Clear npm cache
npm cache clean --force

# 2. Clear NuGet cache (.NET)
dotnet nuget locals all --clear

# 3. Clear user Temp directory
Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue

# 4. Remove Android SDK & emulator files (if Android dev is no longer needed)
Remove-Item -Path "C:\Users\Asus\.android" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "C:\Users\Asus\AppData\Local\Android" -Recurse -Force -ErrorAction SilentlyContinue

# 5. Remove leftover Gradle cache
Remove-Item -Path "C:\Users\Asus\.gradle" -Recurse -Force -ErrorAction SilentlyContinue
```

---

## 5. Cloning & Hardware Transition Steps

1. **Backup `D:`** to Google Drive / Mac Mini (since `D:` will be overwritten during cloning).
2. **Execute Cleanup Commands** above and empty the `Downloads` folder & `Recycle Bin`.
3. **Clone Disk with DiskGenius / Macrium Reflect:**
   * Select Source: 500 GB SSD $\rightarrow$ Target: 256 GB SSD.
   * Let the cloning software automatically shrink the partition to fit the 223.57 GB target.
4. **BIOS Boot Check:** Reboot, press `F2`/`Esc`, select the 256 GB SSD to verify Windows boots cleanly.
5. **Physical Swap:**
   * Move the 256 GB SSD to the main motherboard SATA slot.
   * Remove the 500 GB SSD and place it into a 2.5" SATA-to-USB enclosure.
6. **Format External Drive:** Format the 500 GB drive as **exFAT** for dual compatibility with Windows and macOS.
