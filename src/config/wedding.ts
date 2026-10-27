export const wedding = {
  bride: "Minh Anh",
  groom: "Việt Anh",
  dateTime: "2026-12-27T12:00:00+07:00",
  dateLabel: "Chủ Nhật, ngày 27 tháng 12 năm 2026",
  timeLabel: "12:00",
  ceremonyLabel: "Lễ thành hôn",
  lunarDateLabel: "",
  ceremonyCard: {
    groomName: "Phạm Vũ Việt Anh",
    brideName: "Nguyễn Thị Minh Anh",
    groomFamily: {
      names: ["Phạm Thị Hồng"],
      address: "Thôn Tả Phụ, Xã Hồng Thái, Huyện Kiến Xương, Tỉnh Thái Bình",
    },
    brideFamily: {
      names: ["Nguyễn Duy Thoan", "Nguyễn Thị Len"],
      address: "Thôn Nam Hòa, Xã Hồng Thái, Huyện Kiến Xương, Tỉnh Thái Bình",
    },
    location: "Tư gia",
    time: "12:00",
    lunarDate: "ngày 19 tháng 11 năm Bính Ngọ",
  },
  family: {
    brideSide: {
      father: "",
      mother: "",
      address: "",
      birthOrder: "",
    },
    groomSide: {
      father: "",
      mother: "",
      address: "",
      birthOrder: "",
    },
  },
  invitation:
    "Bằng tất cả yêu thương, chúng mình trân trọng kính mời bạn đến chung vui trong ngày hạnh phúc.",
  story:
    "Từ một lần gặp gỡ tình cờ đến quyết định cùng nhau đi hết cuộc đời. Chúng mình mong ngày vui sẽ trọn vẹn hơn khi có bạn ở bên.",
  coverImage:
    "https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1800&q=82",
  photos: [
    {
      src: "/album-ngan8325.jpg",
      alt: "Cô dâu chú rể trong trang phục cưới",
    },
    {
      src: "/album-ngan8260.jpg",
      alt: "Cô dâu chú rể đứng cạnh nhau giữa hoa",
    },
    {
      src: "/album-ngan8042.jpg",
      alt: "Cô dâu chú rể trao nhau ánh nhìn",
    },
  ],
  venue: {
    name: "Hội trường Thôn Tả Phụ",
    address: "Hội trường thôn Tả Phụ, thôn Tả Phụ xã, Trà Giang, Hưng Yên, Vietnam",
    mapEmbedUrl:
      "https://maps.google.com/maps?q=H%E1%BB%99i%20tr%C6%B0%E1%BB%9Dng%20th%C3%B4n%20T%E1%BA%A3%20Ph%E1%BB%A5%2C%20th%C3%B4n%20T%E1%BA%A3%20Ph%E1%BB%A5%20x%C3%A3%2C%20Tr%C3%A0%20Giang%2C%20H%C6%B0ng%20Y%C3%AAn%2C%20Vietnam&z=17&output=embed",
    googleMapsUrl:
      "https://www.google.com/maps/dir/?api=1&destination=H%E1%BB%99i%20tr%C6%B0%E1%BB%9Dng%20th%C3%B4n%20T%E1%BA%A3%20Ph%E1%BB%A5%2C%20th%C3%B4n%20T%E1%BA%A3%20Ph%E1%BB%A5%20x%C3%A3%2C%20Tr%C3%A0%20Giang%2C%20H%C6%B0ng%20Y%C3%AAn%2C%20Vietnam",
  },
  schedule: [
    { time: "17:00", title: "Đón khách", detail: "Gặp gỡ và lưu lại những khoảnh khắc đẹp" },
    { time: "17:30", title: "Lễ thành hôn", detail: "Khoảnh khắc chúng mình trao lời hẹn ước" },
    { time: "18:00", title: "Khai tiệc", detail: "Cùng nâng ly chúc mừng đôi uyên ương" },
    { time: "19:00", title: "Cắt bánh & nâng ly", detail: "Chia sẻ niềm vui cùng gia đình và bạn bè" },
    { time: "20:30", title: "Kết thúc tiệc", detail: "Cảm ơn bạn đã dành thời gian đến chung vui" },
  ],
  dressCode: {
    label: "Trang phục dự tiệc",
    colors: ["#162b1d", "#d9b16c", "#36583d", "#f1e2be"],
  },
  gift: {
    bankName: "",
    accountName: "",
    accountNumber: "",
  },
  musicUrl: "/music/beautiful-in-white.mp3",
  sampleWishes: [
    "Chúc hai bạn trăm năm hạnh phúc!",
    "Mãi yêu thương và sẻ chia cùng nhau nhé.",
    "Chúc gia đình nhỏ luôn ngập tràn tiếng cười.",
    "Chúc mừng ngày vui của hai bạn!",
    "Hạnh phúc viên mãn, sớm đón tin vui.",
    "Mong mọi hành trình phía trước đều thật đẹp.",
  ],
  blockedKeywords: [] as string[],
  showRsvpCount: false,
} as const;

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
