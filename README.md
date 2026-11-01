# Thiệp cưới

Ứng dụng Next.js tiếng Việt cho thiệp cưới gồm hai trang: trang bìa tại `/` có lá rơi và nút mở thiệp, cùng trang nội dung tại `/invitation`. Thiệp hỗ trợ RSVP, lời chúc công khai và đồng bộ xác nhận tham dự vào Google Sheets. Dữ liệu khách được lưu trong Supabase và chỉ đồng bộ qua API phía máy chủ.

## Chạy tại máy

1. Cài Node.js 20 trở lên.
2. Chạy `npm install`.
3. Sao chép `.env.example` thành `.env.local`, điền cấu hình Supabase và Google Sheets Apps Script.
4. Chạy lần lượt các tệp SQL trong `supabase/migrations/` trong SQL Editor của Supabase.
5. Chạy `npm run dev`, sau đó mở `http://localhost:3000`.

Ứng dụng có thể hiển thị thiệp khi chưa cấu hình backend; RSVP và sổ lời chúc cần Supabase hoạt động.

## Thay nội dung thiệp

Chỉnh duy nhất tệp `src/config/wedding.ts`: tên, ngày giờ có múi giờ `+07:00`, nội dung, ảnh, thông tin cha mẹ hai bên (`family`), lịch trình, màu trang phục (`dressCode`), địa chỉ, tọa độ, đường dẫn bản đồ và thông tin hộp quà (`gift`). Tên cha mẹ và tài khoản ngân hàng mặc định để trống, không hiển thị dữ liệu mẫu. Thay dữ liệu mẫu bằng thông tin thật trước khi công khai. Thêm ảnh bản đồ chụp sẵn vào `public/` rồi cập nhật `venue.mapImage`; nếu chưa có ảnh bản đồ, giao diện vẫn có thẻ chỉ đường thay thế. Ảnh mẫu đang dùng URL Unsplash; để đạt mục tiêu dung lượng/tải nhanh khi ra mắt, thay bằng ảnh WebP đã tối ưu, nhiều kích cỡ và tự host. Chỉ sử dụng ảnh và nhạc mà bạn có quyền sử dụng. Tệp nhạc chưa được cấu hình mặc định; đặt URL hợp lệ tại `musicUrl`.

Tệp cấu hình có thể đặt `showRsvpCount: true` để mở API tổng số khách tham dự. Mặc định tắt. Tên từ tham số `?to=` chỉ dùng để xưng hô, không phải xác thực.

## Biến môi trường

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (hoặc `SUPABASE_SECRET_KEY`): thông tin backend, chỉ dùng phía server.
- `SHEETS_SCRIPT_URL`, `SHEETS_SCRIPT_SECRET`: URL Web App `/exec` và secret dùng chung với Google Apps Script để ghi RSVP vào Google Sheet.
- `RSVP_SHEET_URL`: URL Google Sheet; chỉ trả cho người đã đăng nhập trang quản lý.
- `RSVP_ADMIN_PASSWORD`: mật khẩu riêng, tối thiểu 16 ký tự, cho cô dâu/chú rể.
- `RSVP_ADMIN_SESSION_SECRET`: khóa ngẫu nhiên dài tối thiểu 32 ký tự để ký cookie đăng nhập.
- `RATE_LIMIT_SALT`: chuỗi bí mật dài để giới hạn tần suất API.
- `CRON_SECRET`: bí mật bảo vệ tác vụ đồng bộ lại.
- `ALLOWED_ORIGIN`, `TRUST_PROXY_HEADER`, `RATE_LIMIT_RSVP_PER_HOUR`, `RATE_LIMIT_WISH_PER_HOUR`, `RATE_LIMIT_ADMIN_PER_HOUR`, `RSVP_DEADLINE`, `BLOCKED_KEYWORDS`: các cấu hình API tùy chọn.

## Google Sheet RSVP riêng tư

Khi khách xác nhận, server lưu phản hồi trong Supabase và đồng bộ một hàng vào Google Sheet. Cô dâu/chú rể có thể xem trang bảng trên website sau khi nhập mật khẩu, hoặc mở Google Sheet từ trang đó.

1. Tạo Google Sheet mới. Trong **Share**, chỉ cấp quyền cho tài khoản Google của cô dâu/chú rể; không bật chia sẻ công khai. Sao chép ID nằm giữa `/d/` và `/edit` trong URL.
2. Mở `script.google.com`, tạo Apps Script project và dán nội dung `google-apps-script/Code.gs`.
3. Trong **Project Settings > Script Properties**, thêm `RSVP_SPREADSHEET_ID` là ID sheet và `SHEETS_SCRIPT_SECRET` là chuỗi bí mật dài ít nhất 32 ký tự.
4. Chọn **Deploy > New deployment > Web app**, chọn **Execute as: Me** và **Who has access: Anyone**. Secret kiểm tra request; không đưa URL/secret cho khách. Sao chép URL kết thúc bằng `/exec`.
5. Trong Vercel **Settings > Environment Variables**, thêm `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (hoặc `SUPABASE_SECRET_KEY`), `SHEETS_SCRIPT_URL`, `SHEETS_SCRIPT_SECRET`, `RSVP_SHEET_URL`, `RSVP_ADMIN_PASSWORD`, `RSVP_ADMIN_SESSION_SECRET`, `RATE_LIMIT_SALT` và `CRON_SECRET`. Chọn Production.
6. Deploy lại nhánh `main`. Cô dâu/chú rể mở `/admin/rsvps`, nhập mật khẩu và có thể làm mới danh sách. Cookie đăng nhập tự hết hạn sau 12 giờ.

Lần RSVP mới/cập nhật sẽ tạo hoặc cập nhật một hàng theo mã xác nhận, tránh nhân bản khi retry. Nếu Sheet tạm thời không sẵn sàng, RSVP vẫn được lưu trong Supabase và server sẽ thử đồng bộ lại. Vercel Hobby chạy cron retry mỗi ngày; nút làm mới trên trang quản lý hiển thị dữ liệu Supabase mới nhất.

## Xuất dữ liệu và vận hành

Trong Supabase Dashboard, mở **Table Editor** và xuất bảng `rsvps` hoặc `wishes` ra CSV. Bảng RSVP không có chính sách đọc công khai; chỉ tài khoản quản trị Supabase và service role phía máy chủ mới truy cập được.

Kiểm tra RSVP cần xử lý:

```sql
select id, name, attendance_status, guest_count, confirmed_at,
       notification_status, notification_attempts, next_attempt_at, last_error_code
from public.rsvps
where notification_status = 'failed'
   or (notification_status = 'pending' and confirmed_at < now() - interval '1 hour')
order by confirmed_at desc;
```

Đặt lại một RSVP cần đồng bộ lại, thay `<RSVP_UUID>` bằng ID đã kiểm tra:

```sql
update public.rsvps
set notification_status = 'pending',
    notification_attempts = 0,
    next_attempt_at = now(),
    notification_claimed_at = null,
    last_error_code = null
where id = '<RSVP_UUID>';
```

Ẩn lời chúc không phù hợp:

```sql
update public.wishes set display_status = 'hidden' where id = '<WISH_UUID>';
```

Thông tin RSVP là dữ liệu cá nhân. Xóa hoặc ẩn danh sau 90 ngày kể từ ngày cưới theo chính sách đã thống nhất; bản cài đặt này không tự xóa dữ liệu theo lịch. Chỉ xóa `rsvps`/log sau khi đã xuất dữ liệu cần lưu và xác nhận người phụ trách.

## Kiểm tra

Chạy `npm run typecheck` và `npm run build`. Khi backend đã cấu hình, kiểm thử các trường hợp RSVP yes/no, cập nhật bằng cùng thiết bị, idempotency, lỗi đồng bộ Google Sheet, giới hạn tần suất, lời chúc bị lọc/ẩn, và xuất dữ liệu CSV.
