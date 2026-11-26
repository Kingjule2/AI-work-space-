# JADIDULU — Design System & Standar Kualitas Produk

## 1. Identitas Visual JADIDULU ("Idea into Form")
Standar desain resmi untuk produk dan materi brand JADIDULU:
- **Karakteristik:** Bersih, lapang (*spacious*), flat dengan border halus `1px`, fokus pada keterbacaan tipografi, dan aksi tombol yang tegas.
- **Palet Warna Utama:**
  - `primary` (Action Blue): `#0c74b9` — tombol aksi utama & navigasi aktif
  - `emphasis` (Emphasis Blue): `#0b709a` — sorotan kata judul, outline, fokus keyboard
  - `ink`: `#141414` — judul utama & teks berprioritas tinggi
  - `copy` (Body Slate): `#3c4551` — teks paragraf & navigasi
  - `paper`: `#ffffff` — latar utama & kartu portofolio
  - `warm-paper`: `#fafaf5` — seksi solusi & footer
  - `rule` (Quiet Rule): `#e8e8e8` — garis pemisah halus & border kartu
- **Tipografi:**
  - Display: `48px` Bold (`line-height: 1.25`) — Hero & ajakan penutup
  - Headline: `36px` Bold (`line-height: 1.25`) — Judul seksi
  - Body: `18px` Medium (`line-height: 1.5`) — Paragraf & aksi
  - Label: `15px` Bold (`line-height: 1.5`) — Eyebrow huruf kapital pada Hero/Planning/Closing
- **Radius & Spasi:**
  - Control/Button: `4px` (`height: 54px`, `padding: 10px 14px`)
  - Card: `9px` | Process Card: `8px` | Planning Card: `16px` | Pill: `40px`
  - Spacing scale: `compact 16px`, `standard 24px`, `section-gap 32px`, `section-padding 80px`

## 2. Standar Desain & Engineering untuk Semua Proyek Klien
Kecuali klien memberikan brand guideline spesifik sendiri, seluruh tim UI/UX, Frontend, dan QA wajib menegakkan standar kualitas minimum berikut:

1. **Responsif Tanpa Horizontal Overflow:**
   - Wajib rapi di Desktop (`>= 1200px`), Tablet (`601px–1199px`), dan Mobile (`360px–600px`).
   - Kontrol sentuh pada tampilan mobile minimal tinggi `44px`.
2. **Aksesibilitas (WCAG AA):**
   - Rasio kontras teks minimal **4.5:1** untuk teks normal dan **3:1** untuk teks besar/komponen UI.
   - Seluruh tombol, tautan, tab, dan FAQ menggunakan elemen HTML semantik (`<button>`, `<a>`, `<nav>`, `<main>`) dengan indikator `:focus-visible` yang jelas.
   - Mendukung `prefers-reduced-motion: reduce` (mematikan animasi berlebihan tanpa menyembunyikan konten).
3. **Kualitas Kode & Deliverable Web:**
   - Untuk website proyek klien, pastikan `D:/kumpulan project/jadidulu-projects/<PROJECT_ID>/index.html` langsung bisa dibuka dan berjalan utuh tanpa broken links, tanpa error console, dan tanpa placeholder teks "Lorem ipsum".
   - Jangan pernah memalsukan proyek portofolio atau testimoni jika klien sudah memberikan konten spesifik; gunakan data sesuai brief klien.
4. **Checklist Lulus QA (`@safira`, `@galih`, `@indah`):**
   - Zero console errors & zero uncaught page errors di browser.
   - Seluruh tombol interaktif, navigasi, form, dan state (empty/loading/error/success) berfungsi nyata.
   - Setiap acceptance criterion pada PRD diverifikasi dengan hasil `PASS / FAIL` tertulis.
