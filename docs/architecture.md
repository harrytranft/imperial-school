
# Thiết kế Kiến trúc (Architecture Design)

## 1. Công nghệ sử dụng
- **Frontend:** React (Vite/TSX).
- **Styling:** Tailwind CSS (Theme Gold/Imperial).
- **State Management:** React Hooks (useState, useEffect, useMemo).
- **Data Persistence:** Browser LocalStorage (đảm bảo dữ liệu không mất khi F5).
- **AI Integration:** Gemini API (Để tạo các lời phê/thánh chỉ hài hước khi thăng/giáng cấp).

## 2. Cấu trúc dữ liệu
- `Student`: `{ id, name, gender, classId, points, history: History[] }`
- `History`: `{ id, type: 'plus' | 'minus', amount, reason, timestamp }`
- `Class`: `{ id, name }`

## 3. Luồng xử lý chính
1. **Rank Logic:** Một utility function `getRank(points, gender)` sẽ tính toán cấp bậc dựa trên điểm số thực tế.
2. **Point Update:** Khi update điểm -> trigger `checkLevelChange` -> Nếu đổi level -> Hiển thị thông báo "Thánh chỉ".
3. **Import Logic:** Parser xử lý file CSV và map vào interface `Student`.

## 4. Giao diện (UI/UX)
- Tông màu chủ đạo: Vàng đồng (#D4AF37), Đỏ đô (#800000), Đen gỗ.
- Card học sinh mang phong cách "Thẻ bài quân sư" hoặc "Cuộn chỉ".
