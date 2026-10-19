WEBSITE 20/10 YEU THUONG

Cau truc:
- index.html: giao dien HTML
- styles.css: CSS tuy chinh va animation
- tailwind-config.js: cau hinh mau/font Tailwind
- app.js: random loi chuc, loc danh muc, tao thiep, sao chep, chia se, hieu ung trai tim/canh hoa

Cach chay:
1. Giu cac file trong cung mot thu muc.
2. Mo index.html bang trinh duyet.
3. Can ket noi Internet de tai Tailwind CDN va Google Fonts.

Luu y:
- Nut nhac nen hien dang la mo phong thong bao, chua phat file am thanh.
- Mot so API nhu Clipboard/Web Share can HTTPS hoac localhost de hoat dong day du tren mot so trinh duyet.


CAP NHAT DATABASE GOOGLE SHEETS
- Website lay danh sach loi chuc ngau nhien tu Google Sheets (gid=0).
- Sheet can co hang tieu de voi cac cot Ma_danh_muc, Noi_dung_loi_chuc; cot Trang_thai tuy chon (1 = hien, 0 = an).
- Hay mo Share trong Google Sheets va chon Anyone with the link / Bat ky ai co duong lien ket: Viewer / Nguoi xem.
- Neu van khong tai duoc, vao File > Share > Publish to web va xuat ban tab du lieu; sau do tai lai trang.
- Chay website qua localhost hoac hosting HTTPS, khong nen mo truc tiep bang file:// vi trinh duyet co the chan fetch.
- Cac mau cau trong khu vuc ca nhan hoa (chon giong dieu) van la mau noi dung rieng trong app.js; sheet hien tai chi co mot cot noi dung loi chuc nen chua du du lieu de thay the cac mau do.
