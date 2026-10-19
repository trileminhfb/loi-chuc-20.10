WEBSITE 20/10 YEU THUONG - BAN CAP NHAT

Cau truc:
- index.html: giao dien website va form tao thiep
- styles.css: mau sac, bo cuc va hieu ung sticker roi
- tailwind-config.js: cau hinh mau/font Tailwind
- app.js: doc Google Sheets, random loi chuc, tao thiep, sao chep, xuat PNG va sticker

Cach chay:
1. Giu cac file trong cung mot thu muc.
2. Chay qua localhost/hosting HTTPS de Clipboard hoat dong on dinh; mo index.html truc tiep van co the bi trinh duyet chan fetch Google Sheets.
3. Can ket noi Internet de tai Tailwind, Google Fonts, html2canvas va sticker demo.

GOOGLE SHEETS:
- Website doc hai tab trong spreadsheet dang cau hinh trong app.js: Loi_chuc va Tao_loi_chuc.
- Tab Loi_chuc dung cho phan "Thiep chuc", can cac cot: ID, Noi_dung_loi_chuc, Trang_thai. Moi dong trang thai 1 la loi chuc chung cho tat ca moi nguoi; khong can cot danh muc.
- Tab Tao_loi_chuc dung cho phan "Tao thiep rieng", can cac cot: Danh_muc, Doi_tuong, Phong_cach, Mau_noi_dung, Cau_ket, Bien_can_thay, Trang_thai.
- Trang_thai = 1 de hien loi chuc/mau; 0 de an. Dong co Trang_thai trong se duoc xem la dang hoat dong.
- Tab Tao_loi_chuc: cac doi tuong loc theo Danh_muc; Phong_cach duoc lay tu cac gia tri duy nhat trong cot Phong_cach.
- Mau_noi_dung ho tro bien dang {ten_nguoi_nhan}, {ten}, [TEN] va cac bien trong ngoac nhon/vuong; bien chua nhan dang se duoc thay bang ten nguoi nhan. Cau_ket duoc them vao cuoi loi chuc.
- Chia se ca spreadsheet de "Anyone with the link / Bat ky ai co duong lien ket: Viewer / Nguoi xem".
- Neu doi ten tab, cap nhat WISHES_SHEET_NAME hoac CUSTOM_TEMPLATES_SHEET_NAME trong app.js.

Tao va tai thiep:
- Chon ten, danh muc, doi tuong, phong cach roi nhan Tao loi chuc danh rieng.
- Sao chep noi dung se sao chep thong diep da tao.
- Tai thiep PNG se xuat khung thiep hien thi thanh anh PNG.
- Sticker demo dung anh hoa tu Canva va emoji no/trai tim/buom; co the thay URL trong app.js hoac bo sung them URL anh sau.

Nhac nen:
- Nhac duoc tai tu access/theme music.mp3 va lap lai lien tuc.
- Website thu tu phat nhac khi mo trang; trinh duyet co the chan tu phat, khi do nhan nut not nhac de bat.
- Nut not nhac tren dau trang va nut "Am nhac" o chan trang dung de bat/tat nhac nen.

Luu y:
- Neu sheet khong tai duoc, hay kiem tra quyen chia se, ten tab va ket noi Internet.
