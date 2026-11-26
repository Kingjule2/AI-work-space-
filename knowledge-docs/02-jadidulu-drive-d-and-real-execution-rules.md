# JADIDULU — Aturan Wajib Drive D, Eksekusi Nyata & Protokol Handoff

## R1. DRIVE D ONLY (Wajib untuk Semua Waker)
Seluruh pekerjaan, operasi file, instalasi paket, dan perintah CLI oleh seluruh Waker **WAJIB** dilakukan hanya di **Drive D**, di bawah folder `D:\kumpulan project\`. Drive C hampir penuh sehingga dilarang menulis, mengunduh, meng-cache, atau membuat file sementara di Drive C.

- **Verifikasi Path Sebelum Menulis:** Pastikan working directory dan target path selalu dimulai dengan `D:\kumpulan project\`.
- **Folder Kerja Resmi:**
  - Aplikasi Virtual Office: `D:\kumpulan project\aiworkspace\`
  - Output & Kode Proyek Klien: `D:\kumpulan project\jadidulu-projects\<PROJECT_ID>\`
  - Konfigurasi & Roster: `D:\kumpulan project\jadidulu-config\`
  - Arsip & Protokol: `D:\kumpulan project\jadidulu-records\`
- **Pengalihan Cache & Temp (Session-Level Env Vars):**
  - `TEMP` & `TMP` & `TMPDIR` → `D:\kumpulan project\_tmp`
  - `npm_config_cache` → `D:\kumpulan project\_cache\npm`
  - `PIP_CACHE_DIR` → `D:\kumpulan project\_cache\pip`
  - `PLAYWRIGHT_BROWSERS_PATH` → `D:\kumpulan project\_cache\playwright`
  - Gunakan instalasi lokal per proyek; jangan instal tools secara global ke Drive C.
- **Batas Ruang Disk:** Jika ruang kosong Drive D turun di bawah **10 GB**, segera berhenti dan laporkan ke Founder.
- **Larangan Mengubah Sistem:** Jangan mengubah system settings atau persistent environment variables tanpa izin eksplisit Founder.

## R2. KREDIT ASLI & APLIKASI NYATA (Anti-Mock dalam Pembuktian)
- Seluruh pengujian penerimaan dan pengiriman hasil proyek harus dijalankan pada aplikasi nyata di `D:\kumpulan project\jadidulu-projects\<PROJECT_ID>\` (untuk website: simpan entry page runnable di `index.html` beserta CSS/JS terkait).
- Demo mode, data tiruan, simulasi hasil kerja, atau sekadar menuliskan rencana tanpa membuat file nyata **tidak boleh** diklaim sebagai bukti selesai.
- Mock hanya boleh dipakai saat unit testing internal pengembangan dan wajib diberi label `MOCK`.

## R3. Protokol Amplop Handoff (Handoff Envelope)
Setiap serah terima artefak antar-Waker wajib menyertakan metadata berikut secara jelas:

```text
project_id: P-<KODE>
artifact_type: validated_brief | prd | project_pack | design_spec | api_contract | frontend_build | backend_build | qa_report | release_report
version: vN
from: <nama_waker / peran>
to: <nama_waker / peran>
status: READY | NEEDS_CLARIFICATION | BLOCKED | REJECTED | WAITING_APPROVAL | PASSED
created_at: YYYY-MM-DD HH:MM (Asia/Jakarta)
artifact_path: D:/kumpulan project/jadidulu-projects/<PROJECT_ID>/<file>
acceptance_criteria: <ringkasan kriteria lulus>
blockers: none | <daftar blocker eksplisit>
```

- Saat melakukan handoff di grup QoderWake, selalu sertakan `participantId` Waker tujuan pada `wake_participant_ids` (atau mention resmi) agar QoderWake langsung membangunkan Waker berikutnya.
- Jangan mengulang tahap yang sudah berstatus `READY` untuk pasangan `(project_id, artifact_type, version)` yang sama.
