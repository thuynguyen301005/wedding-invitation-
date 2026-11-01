# Thiệp cưới

Ứng dụng Next.js tiếng Việt cho thiệp cưới gồm hai trang: trang bìa tại `/` có lá rơi và nút mở thiệp, cùng trang nội dung tại `/invitation`. Thiệp hỗ trợ RSVP, lời chúc công khai và thông báo email qua Google Apps Script. Dữ liệu khách không được truy cập trực tiếp từ trình duyệt: API chạy phía máy chủ, lưu vào Supabase Postgres rồi mới gửi email.

## Chạy tại máy

1. Cài Node.js 20 trở lên.
2. Chạy `npm install`.
3. Sao chép `.env.example` thành `.env.local`, điền cấu hình Supabase và Google Apps Script.
4. Chạy nội dung `supabase/migrations/001_initial_schema.sql` trong SQL Editor của Supabase.
5. Chạy `npm run dev`, sau đó mở `http://localhost:3000`.

Ứng dụng có thể hiển thị thiệp khi chưa cấu hình backend; RSVP và sổ lời chúc cần Supabase hoạt động.

## Thay nội dung thiệp

Chỉnh duy nhất tệp `src/config/wedding.ts`: tên, ngày giờ có múi giờ `+07:00`, nội dung, ảnh, thông tin cha mẹ hai bên (`family`), lịch trình, màu trang phục (`dressCode`), địa chỉ, tọa độ, đường dẫn bản đồ và thông tin hộp quà (`gift`). Tên cha mẹ và tài khoản ngân hàng mặc định để trống, không hiển thị dữ liệu mẫu. Thay dữ liệu mẫu bằng thông tin thật trước khi công khai. Thêm ảnh bản đồ chụp sẵn vào `public/` rồi cập nhật `venue.mapImage`; nếu chưa có ảnh bản đồ, giao diện vẫn có thẻ chỉ đường thay thế. Ảnh mẫu đang dùng URL Unsplash; để đạt mục tiêu dung lượng/tải nhanh khi ra mắt, thay bằng ảnh WebP đã tối ưu, nhiều kích cỡ và tự host. Chỉ sử dụng ảnh và nhạc mà bạn có quyền sử dụng. Tệp nhạc chưa được cấu hình mặc định; đặt URL hợp lệ tại `musicUrl`.

Tệp cấu hình có thể đặt `showRsvpCount: true` để mở API tổng số khách tham dự. Mặc định tắt. Tên từ tham số `?to=` chỉ dùng để xưng hô, không phải xác thực.

## Biến môi trường

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: chỉ phía máy chủ; không đặt tiền tố `NEXT_PUBLIC_` cho khóa bí mật.
- `GMAIL_SCRIPT_URL`, `GMAIL_SCRIPT_SECRET`: URL Web App và khóa dùng chung với Google Apps Script để gửi email RSVP tới `minhanh01205@gmail.com`.
- `ALLOWED_ORIGIN`: origin chính thức của website; nếu bỏ trống, API chấp nhận cùng origin với request.
- `TRUST_PROXY_HEADER`: header địa chỉ do proxy tin cậy đặt; tự chọn `x-nf-client-connection-ip` trên Netlify và `x-vercel-forwarded-for` trên Vercel. Không dùng `x-forwarded-for` từ người dùng tùy ý.
- `RATE_LIMIT_SALT`: chuỗi bí mật dài để băm IP; IP gốc không được lưu.
- `RATE_LIMIT_RSVP_PER_HOUR`, `RATE_LIMIT_WISH_PER_HOUR`: mặc định 10 yêu cầu/IP/giờ; guest token bị giới hạn 5 lần/giờ.
- `NOTIFY_ON_DECLINE`: mặc định `true` để cô dâu nhận email với mọi phản hồi RSVP; `SHOW_RSVP_COUNT` mặc định `false`.
- `RSVP_DEADLINE`: thời điểm ISO tùy chọn.
- `BLOCKED_KEYWORDS`: từ khóa cấm phân tách bằng dấu phẩy.
- `CRON_SECRET`: bí mật bảo vệ endpoint thử gửi lại email.

## Cấu hình gửi email bằng Google Apps Script

RSVP sẽ gửi email sau khi lưu xác nhận. Không cần domain gửi riêng:

1. Mở `script.google.com` bằng tài khoản Gmail muốn dùng để gửi email, tạo project và dán mã trong `google-apps-script/Code.gs`.
2. Trong **Project Settings > Script Properties**, thêm `GMAIL_SCRIPT_SECRET` với một chuỗi ngẫu nhiên dài. Dùng cùng giá trị này trên Vercel và giữ bí mật.
3. Chọn **Deploy > New deployment > Web app**, đặt **Execute as: Me** và **Who has access: Anyone**. Cấp quyền gửi email, sau đó sao chép URL Web App kết thúc bằng `/exec`.
4. Trong Vercel > **Settings > Environment Variables**, thêm `GMAIL_SCRIPT_URL` là URL `/exec` và `GMAIL_SCRIPT_SECRET` là cùng secret ở bước 2. Cũng cần `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (hoặc `SUPABASE_SECRET_KEY`) và `RATE_LIMIT_SALT`, sau đó deploy lại.

Script chỉ gửi thông báo cố định “Đã xác nhận thành công.” tới `minhanh01205@gmail.com`, từ tài khoản Gmail đã cấp quyền. Lỗi gửi tạm thời sẽ được thử lại; cron trên Vercel Hobby chạy mỗi ngày một lần. Trên Netlify, thêm các biến tương tự trong Site configuration > Environment variables.

API sổ lời chúc hỗ trợ schema cũ (`name`, `message`) và schema migration (`sender_name`, `content`). Sau khi deploy, gửi RSVP thử và kiểm tra log Vercel/Netlify cũng như Apps Script.

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

Đặt lại một RSVP cần thử gửi lại, thay `<RSVP_UUID>` bằng ID đã kiểm tra:

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

Chạy `npm run typecheck` và `npm run build`. Khi backend đã cấu hình, kiểm thử các trường hợp RSVP yes/no, cập nhật bằng cùng thiết bị, idempotency, lỗi Resend, giới hạn tần suất, lời chúc bị lọc/ẩn, và xuất dữ liệu CSV.
