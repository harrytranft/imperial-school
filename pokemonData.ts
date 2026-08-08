export interface PokemonInfo {
  dexId: number;
  name: string;
  types: string[];
  description: string;
}

export interface Accessory {
  id: string;
  name: string;
  icon: string;
  cost: number;
  description: string;
}

export interface PetSkill {
  id: string;
  name: string;
  icon: string;
  cost: number;
  description: string;
}

export const LIST_POKEMONS: PokemonInfo[] = [
  { dexId: 25, name: 'Pikachu', types: ['Electric'], description: 'Pokémon Chuột Điện nổi tiếng, vô cùng thông minh và trung thành.' },
  { dexId: 1, name: 'Bulbasaur', types: ['Grass', 'Poison'], description: 'Ẩn chứa một hạt giống kỳ lạ trên lưng từ lúc mới sinh.' },
  { dexId: 4, name: 'Charmander', types: ['Fire'], description: 'Ngọn lửa ở đuôi thể hiện sinh lực và tâm trạng của nó.' },
  { dexId: 7, name: 'Squirtle', types: ['Water'], description: 'Chiếc mai rùa cứng cáp bảo vệ nó khỏi mọi cú va chạm.' },
  { dexId: 133, name: 'Eevee', types: ['Normal'], description: 'Có kết cấu gen đặc biệt giúp tiến hóa thành nhiều dạng cực ngầu.' },
  { dexId: 39, name: 'Jigglypuff', types: ['Normal', 'Fairy'], description: 'Sở hữu giọng hát thôi miên có thể ru ngủ bất kỳ đối thủ nào.' },
  { dexId: 54, name: 'Psyduck', types: ['Water'], description: 'Luôn bị đau đầu và phát ra sức mạnh tâm linh cực đại.' },
  { dexId: 151, name: 'Mew', types: ['Psychic'], description: 'Pokémon huyền thoại sở hữu gen di truyền của tất cả Pokémon.' },
  { dexId: 155, name: 'Cyndaquil', types: ['Fire'], description: 'Cực kỳ nhút nhát nhưng khả năng phun lửa phòng thủ rất tuyệt.' },
  { dexId: 143, name: 'Snorlax', types: ['Normal'], description: 'Chỉ ăn và ngủ, nhưng sức mạnh thể chất thì không ai bằng.' },
  { dexId: 258, name: 'Mudkip', types: ['Water'], description: 'Sử dụng chiếc vây trên đầu để định vị dòng nước chảy.' },
  { dexId: 175, name: 'Togepi', types: ['Fairy'], description: 'Quả trứng hạnh phúc, mang lại sự may mắn dồi dào cho người sở hữu.' },
  { dexId: 448, name: 'Lucario', types: ['Fighting', 'Steel'], description: 'Có thể cảm nhận và điều khiển Aura để thấu hiểu lòng người.' },
  { dexId: 658, name: 'Greninja', types: ['Water', 'Dark'], description: 'Ninja ếch huyền thoại di chuyển nhanh thoăn thắt như gió.' },
  { dexId: 94, name: 'Gengar', types: ['Ghost', 'Poison'], description: 'Pokémon bóng ma tinh nghịch và luôn thích trêu chọc mọi người.' },
  { dexId: 152, name: 'Chikorita', types: ['Grass'], description: 'Chiếc lá trên đầu tỏa ra mùi hương dịu nhẹ làm nguôi giận.' },
  { dexId: 158, name: 'Totodile', types: ['Water'], description: 'Tràn đầy năng lượng, luôn thích ngoạm thử mọi thứ chuyển động.' },
  { dexId: 252, name: 'Treecko', types: ['Grass'], description: 'Bình tĩnh, quyết đoán và có thể bám chặt vào bất kỳ bề mặt nào.' },
  { dexId: 255, name: 'Torchic', types: ['Fire'], description: 'Bên trong cơ thể chứa một kho chứa lửa ấm áp.' },
  { dexId: 384, name: 'Rayquaza', types: ['Dragon', 'Flying'], description: 'Rồng thần tối cao ngự trị ở tầng ôzôn hàng triệu năm.' },
  { dexId: 132, name: 'Ditto', types: ['Normal'], description: 'Có thể biến hình thành bất kỳ đối tượng nào nó nhìn thấy.' },
  { dexId: 470, name: 'Leafeon', types: ['Grass'], description: 'Tiến hóa từ Eevee dưới tác động của rêu phong xanh ngát.' }
];

export const LIST_ACCESSORIES: Accessory[] = [
  { id: 'acc_cape', name: 'Áo Choàng Hoàng Gia', icon: '🧥', cost: 15, description: 'Tăng vẻ uy nghiêm, khiến Pet trông như một vị Đại thần quyền quý.' },
  { id: 'acc_crown', name: 'Vương Miện Hoàng Đế', icon: '👑', cost: 30, description: 'Phụ kiện tối thượng thể hiện vị thế bá chủ triều đình.' },
  { id: 'acc_hat', name: 'Nón Thám Hiểm', icon: '🤠', cost: 10, description: 'Mang đậm phong cách phiêu lưu, thích hợp cho việc học hỏi cái mới.' },
  { id: 'acc_scarf', name: 'Khăn Choàng Đỏ Thắm', icon: '🧣', cost: 10, description: 'Chiếc khăn giữ ấm cổ sành điệu, tôn lên khí chất thông tuệ.' },
  { id: 'acc_glasses', name: 'Kính Mắt Ngầu Lòi', icon: '🕶️', cost: 12, description: 'Làm mờ mắt tất cả những câu hỏi khó nhằn của Thầy Cô.' },
  { id: 'acc_bandana', name: 'Băng Trán Ninja', icon: '🥷', cost: 12, description: 'Đeo vào đầu để gia tăng tinh thần tập trung cao độ trong lớp học.' },
  { id: 'acc_backpack', name: 'Ba-lô Nhỏ Sách Vở', icon: '🎒', cost: 15, description: 'Chiếc balo tiện lợi có chứa kẹo ngọt tiếp thêm năng lượng.' },
  { id: 'acc_wings', name: 'Đôi Cánh Thiên Thần', icon: '🪶', cost: 25, description: 'Tỏa ra ánh hào quang hoàng tộc chói lọi xung quanh Pet.' },
  { id: 'acc_mustache', name: 'Râu Quý Tộc Giáo Sư', icon: '🥸', cost: 10, description: 'Tạo vẻ ngoài trưởng thành, uyên bác đầy thuyết phục.' },
  { id: 'acc_ring', name: 'Nhẫn Ngọc Triệu Phú', icon: '💍', cost: 15, description: 'Hột xoàn siêu to khổng lồ lấp lánh khẳng định độ giàu có.' },
  { id: 'acc_shield', name: 'Khiên Chắn Trạng Nguyên', icon: '🛡️', cost: 18, description: 'Chiếc khiên nhỏ giúp tăng tinh thần vững chãi trước áp lực kiểm tra.' },
  { id: 'acc_halo', name: 'Vòng Hào Quang Trí Tuệ', icon: '😇', cost: 20, description: 'Vòng sáng thánh thiện chứng nhận học sĩ chăm ngoan học giỏi.' }
];

export const LIST_PET_SKILLS: PetSkill[] = [
  { id: 'sk_evade', name: 'Skill Né Trực Diện', icon: '💨', cost: 25, description: 'Khi giáo viên gọi trả lời câu hỏi khó, có quyền trao lại quyền trả lời cho bạn khác.' },
  { id: 'sk_guard', name: 'Lá Chắn Hộ Vệ', icon: '🛡️', cost: 20, description: 'Giảm 50% số điểm bị phạt của lần đầu sai sót trong ngày.' },
  { id: 'sk_double', name: 'Pháp Bảo Nhân Đôi', icon: '🎰', cost: 30, description: 'Cơ hội nhân đôi (+100%) số điểm nhận được từ một câu trả lời xuất sắc.' },
  { id: 'sk_rescue', name: 'Hộ Tống Đồng Đội', icon: '🤝', cost: 20, description: 'Được tặng tối đa 3 điểm của mình để cứu viện một bạn khác bị phạt.' },
  { id: 'sk_swap', name: 'Đổi Đề Thần Tốc', icon: '🔄', cost: 22, description: 'Yêu cầu Thầy/Cô đổi câu hỏi khác dễ hơn nếu câu hiện tại quá khó.' },
  { id: 'sk_decree', name: 'Ý Chỉ Đồng Hành', icon: '📜', cost: 26, description: 'Được phép chỉ định một học sĩ bất kỳ thảo luận nhóm hỗ trợ trả lời câu hỏi.' },
  { id: 'sk_survival', name: 'Kim Bài Miễn Tử', icon: '🎫', cost: 40, description: 'Bỏ qua một lần bị trừ điểm (muộn học, quên bài tập, nghịch đồ, vv.)' },
  { id: 'sk_clairvoyance', name: 'Mắt Thần Trí Tuệ', icon: '👁️', cost: 24, description: 'Được nhận một gợi ý trực tiếp từ Thầy/Cô trước khi chốt đáp án.' },
  { id: 'sk_companion', name: 'Trợ Thủ Tra Cứu', icon: '📖', cost: 16, description: 'Được đặc cách mở vở xem tài liệu hoặc tra cứu trong vòng 30 giây.' },
  { id: 'sk_rapid', name: 'Cướp Quyền Tranh Đoạt', icon: '⚡', cost: 20, description: 'Được ưu tiên tuyệt đối giành quyền phát biểu đầu tiên khi giơ tay.' },
  { id: 'sk_soul_link', name: 'Đồng Tâm Hiệp Lực', icon: '🔗', cost: 30, description: 'Khi bạn cùng bàn của bạn trả lời đúng, bạn cũng được cộng ké 1 điểm ấm lòng.' },
  { id: 'sk_lucky', name: 'Vòng Quay Tự Tin', icon: '🎡', cost: 24, description: 'Nhận ngay +2 điểm nếu bạn được gọi trúng qua nút Random.' },
  { id: 'sk_cloak', name: 'Tàng Hình Chi Thuật', icon: '🌫️', cost: 28, description: 'Bật ẩn thân để không bị gọi tên trả lời câu hỏi hoặc giao nhiệm vụ trong 1 tiết học.' },
  { id: 'sk_furious', name: 'Khiên Chắn Phản Đòn', icon: '💥', cost: 18, description: 'Phá giải hoàn toàn trò đùa giỡn, cướp điểm từ bạn bè khác.' },
  { id: 'sk_dual', name: 'Song Kiếm Hợp Bích', icon: '⚔️', cost: 25, description: 'Đồng trả lời câu hỏi khó cùng 1 bạn khác, cả 2 đều được hưởng trọn số điểm cộng.' },
  { id: 'sk_recovery', name: 'Sám Hối Thu Hồi', icon: '⚖️', cost: 25, description: 'Xin phục hồi 50% số điểm vừa bị trừ bằng cách hứa tiếp thu tích cực.' },
  { id: 'sk_blessing', name: 'Phúc Lành Trấn An', icon: '✨', cost: 20, description: 'Khiến cả lớp nhận hiệu ứng cộng thêm 1 điểm khi ai đó trả lời đúng.' },
  { id: 'sk_inspire', name: 'Truyền Cảm Hứng', icon: '🗣️', cost: 18, description: 'Học sĩ dũng cảm mở màn nhận xét bài học sẽ nhận điểm gấp đôi.' },
  { id: 'sk_healing', name: 'Bạch Ngọc Chữa Lành', icon: '💚', cost: 22, description: 'Rút lại 1 kết quả trừ điểm gần nhất trong ngày hôm nay của chính mình.' },
  { id: 'sk_scholar', name: 'Ủy Thác Trạng Nguyên', icon: '🎖️', cost: 35, description: 'Nhờ vả Trạng Nguyên bảng xếp hạng gánh tạ câu hỏi và chia đôi cát-xê điểm.' },
  { id: 'sk_time_warp', name: 'Bẻ Cong Thời Gian', icon: '⏳', cost: 20, description: 'Yêu cầu cộng thêm 10 giây thời gian suy nghĩ bài kiểm tra hoặc trả lời câu hỏi.' },
  { id: 'sk_emperor', name: 'Sức Mạnh Thiên Tử', icon: '👑', cost: 50, description: 'Lần thăng cấp tiếp theo của bạn sẽ cộng thêm 5 điểm Hào Quang bonus.' }
];

export function getRandomPokemon(): PokemonInfo {
  const index = Math.floor(Math.random() * LIST_POKEMONS.length);
  return LIST_POKEMONS[index];
}

export const POKEMON_EVOLUTION_CHAINS: Record<number, { dexId: number; name: string; types: string[] }[][]> = {
  1: [ // Bulbasaur chain
    [{ dexId: 1, name: 'Bulbasaur', types: ['Grass', 'Poison'] }],
    [{ dexId: 2, name: 'Ivysaur', types: ['Grass', 'Poison'] }],
    [{ dexId: 3, name: 'Venusaur', types: ['Grass', 'Poison'] }],
    [{ dexId: 10033, name: 'Mega Venusaur', types: ['Grass', 'Poison'] }],
    [{ dexId: 10195, name: 'Venusaur Gigantamax', types: ['Grass', 'Poison'] }]
  ],
  4: [ // Charmander chain
    [{ dexId: 4, name: 'Charmander', types: ['Fire'] }],
    [{ dexId: 5, name: 'Charmeleon', types: ['Fire'] }],
    [{ dexId: 6, name: 'Charizard', types: ['Fire', 'Flying'] }],
    [
      { dexId: 10034, name: 'Mega Charizard X', types: ['Fire', 'Dragon'] },
      { dexId: 10035, name: 'Mega Charizard Y', types: ['Fire', 'Flying'] }
    ],
    [{ dexId: 10196, name: 'Charizard Gigantamax', types: ['Fire'] }]
  ],
  7: [ // Squirtle chain
    [{ dexId: 7, name: 'Squirtle', types: ['Water'] }],
    [{ dexId: 8, name: 'Wartortle', types: ['Water'] }],
    [{ dexId: 9, name: 'Blastoise', types: ['Water'] }],
    [{ dexId: 10036, name: 'Mega Blastoise', types: ['Water'] }],
    [{ dexId: 10197, name: 'Blastoise Gigantamax', types: ['Water'] }]
  ],
  25: [ // Pikachu chain
    [{ dexId: 25, name: 'Pikachu', types: ['Electric'] }],
    [{ dexId: 26, name: 'Raichu', types: ['Electric'] }],
    [{ dexId: 10100, name: 'Alolan Raichu', types: ['Electric', 'Psychic'] }],
    [{ dexId: 10199, name: 'Pikachu Gigantamax', types: ['Electric'] }],
    [{ dexId: 25, name: 'Cosmic Pikachu', types: ['Electric', 'Cosmic'] }]
  ],
  133: [ // Eevee chain (multi-choice!)
    [{ dexId: 133, name: 'Eevee', types: ['Normal'] }],
    [
      { dexId: 134, name: 'Vaporeon', types: ['Water'] },
      { dexId: 135, name: 'Jolteon', types: ['Electric'] },
      { dexId: 136, name: 'Flareon', types: ['Fire'] }
    ],
    [
      { dexId: 196, name: 'Espeon', types: ['Psychic'] },
      { dexId: 197, name: 'Umbreon', types: ['Dark'] }
    ],
    [
      { dexId: 470, name: 'Leafeon', types: ['Grass'] },
      { dexId: 471, name: 'Glaceon', types: ['Ice'] },
      { dexId: 700, name: 'Sylveon', types: ['Fairy'] }
    ],
    [{ dexId: 10205, name: 'Eevee Gigantamax', types: ['Normal'] }]
  ],
  39: [ // Jigglypuff chain
    [{ dexId: 39, name: 'Jigglypuff', types: ['Normal', 'Fairy'] }],
    [{ dexId: 40, name: 'Wigglytuff', types: ['Normal', 'Fairy'] }],
    [{ dexId: 174, name: 'Igglybuff', types: ['Normal', 'Fairy'] }],
    [{ dexId: 985, name: 'Scream Tail', types: ['Fairy', 'Psychic'] }],
    [{ dexId: 40, name: 'Wigglytuff Gigantamax', types: ['Normal', 'Fairy'] }]
  ],
  54: [ // Psyduck chain
    [{ dexId: 54, name: 'Psyduck', types: ['Water'] }],
    [{ dexId: 55, name: 'Golduck', types: ['Water'] }],
    [{ dexId: 54, name: 'Zen Psyduck', types: ['Water', 'Psychic'] }],
    [{ dexId: 55, name: 'Mega Golduck', types: ['Water', 'Psychic'] }],
    [{ dexId: 55, name: 'Omega Golduck', types: ['Water', 'Cosmic'] }]
  ],
  151: [ // Mew chain
    [{ dexId: 151, name: 'Mew', types: ['Psychic'] }],
    [{ dexId: 150, name: 'Mewtwo', types: ['Psychic'] }],
    [{ dexId: 10044, name: 'Mega Mewtwo Y', types: ['Psychic'] }],
    [{ dexId: 10043, name: 'Mega Mewtwo X', types: ['Psychic', 'Fighting'] }],
    [{ dexId: 151, name: 'Ancestral Mew', types: ['Psychic', 'Cosmic'] }]
  ],
  155: [ // Cyndaquil chain
    [{ dexId: 155, name: 'Cyndaquil', types: ['Fire'] }],
    [{ dexId: 156, name: 'Quilava', types: ['Fire'] }],
    [{ dexId: 157, name: 'Typhlosion', types: ['Fire'] }],
    [{ dexId: 10233, name: 'Hisuian Typhlosion', types: ['Fire', 'Ghost'] }],
    [{ dexId: 157, name: 'Typhlosion Gigantamax', types: ['Fire', 'Ghost'] }]
  ],
  143: [ // Snorlax chain
    [{ dexId: 143, name: 'Snorlax', types: ['Normal'] }],
    [{ dexId: 446, name: 'Munchlax', types: ['Normal'] }],
    [{ dexId: 143, name: 'Heavy Snorlax', types: ['Normal'] }],
    [{ dexId: 10204, name: 'Snorlax Gigantamax', types: ['Normal', 'Grass'] }],
    [{ dexId: 143, name: 'Titan Snorlax', types: ['Normal', 'Titan'] }]
  ],
  258: [ // Mudkip chain
    [{ dexId: 258, name: 'Mudkip', types: ['Water'] }],
    [{ dexId: 259, name: 'Marshtomp', types: ['Water', 'Ground'] }],
    [{ dexId: 260, name: 'Swampert', types: ['Water', 'Ground'] }],
    [{ dexId: 10064, name: 'Mega Swampert', types: ['Water', 'Ground'] }],
    [{ dexId: 260, name: 'Swampert Gigantamax', types: ['Water', 'Ground'] }]
  ],
  175: [ // Togepi chain
    [{ dexId: 175, name: 'Togepi', types: ['Fairy'] }],
    [{ dexId: 176, name: 'Togetic', types: ['Fairy', 'Flying'] }],
    [{ dexId: 468, name: 'Togekiss', types: ['Fairy', 'Flying'] }],
    [{ dexId: 468, name: 'Seraphic Togekiss', types: ['Fairy', 'Flying'] }],
    [{ dexId: 175, name: 'Togepi Celestial', types: ['Fairy', 'Cosmic'] }]
  ],
  448: [ // Lucario chain
    [{ dexId: 447, name: 'Riolu', types: ['Fighting'] }],
    [{ dexId: 448, name: 'Lucario', types: ['Fighting', 'Steel'] }],
    [{ dexId: 10059, name: 'Mega Lucario', types: ['Fighting', 'Steel'] }],
    [{ dexId: 448, name: 'Aura Lucario', types: ['Fighting', 'Steel'] }],
    [{ dexId: 448, name: 'Lucario Gigantamax', types: ['Fighting', 'Steel'] }]
  ],
  658: [ // Greninja chain
    [{ dexId: 656, name: 'Froakie', types: ['Water'] }],
    [{ dexId: 657, name: 'Frogadier', types: ['Water'] }],
    [{ dexId: 658, name: 'Greninja', types: ['Water', 'Dark'] }],
    [{ dexId: 10121, name: 'Ash-Greninja', types: ['Water', 'Dark'] }],
    [{ dexId: 658, name: 'Greninja Shadowstrike', types: ['Water', 'Dark'] }]
  ],
  94: [ // Gengar chain
    [{ dexId: 92, name: 'Gastly', types: ['Ghost', 'Poison'] }],
    [{ dexId: 93, name: 'Haunter', types: ['Ghost', 'Poison'] }],
    [{ dexId: 94, name: 'Gengar', types: ['Ghost', 'Poison'] }],
    [{ dexId: 10038, name: 'Mega Gengar', types: ['Ghost', 'Poison'] }],
    [{ dexId: 10200, name: 'Gengar Gigantamax', types: ['Ghost', 'Poison'] }]
  ],
  152: [ // Chikorita chain
    [{ dexId: 152, name: 'Chikorita', types: ['Grass'] }],
    [{ dexId: 153, name: 'Bayleef', types: ['Grass'] }],
    [{ dexId: 154, name: 'Meganium', types: ['Grass'] }],
    [{ dexId: 154, name: 'Botanical Meganium', types: ['Grass', 'Fairy'] }],
    [{ dexId: 154, name: 'Meganium Gigantamax', types: ['Grass', 'Fairy'] }]
  ],
  158: [ // Totodile chain
    [{ dexId: 158, name: 'Totodile', types: ['Water'] }],
    [{ dexId: 159, name: 'Croconaw', types: ['Water'] }],
    [{ dexId: 160, name: 'Feraligatr', types: ['Water'] }],
    [{ dexId: 160, name: 'Mega Feraligatr', types: ['Water', 'Dark'] }],
    [{ dexId: 160, name: 'Feraligatr Gigantamax', types: ['Water'] }]
  ],
  252: [ // Treecko chain
    [{ dexId: 252, name: 'Treecko', types: ['Grass'] }],
    [{ dexId: 253, name: 'Grovyle', types: ['Grass'] }],
    [{ dexId: 254, name: 'Sceptile', types: ['Grass', 'Dragon'] }],
    [{ dexId: 10065, name: 'Mega Sceptile', types: ['Grass', 'Dragon'] }],
    [{ dexId: 254, name: 'Sceptile Gigantamax', types: ['Grass', 'Dragon'] }]
  ],
  255: [ // Torchic chain
    [{ dexId: 255, name: 'Torchic', types: ['Fire'] }],
    [{ dexId: 256, name: 'Combusken', types: ['Fire', 'Fighting'] }],
    [{ dexId: 257, name: 'Blaziken', types: ['Fire', 'Fighting'] }],
    [{ dexId: 10050, name: 'Mega Blaziken', types: ['Fire', 'Fighting'] }],
    [{ dexId: 257, name: 'Blaziken Gigantamax', types: ['Fire', 'Fighting'] }]
  ],
  384: [ // Rayquaza chain
    [{ dexId: 384, name: 'Rayquaza', types: ['Dragon', 'Flying'] }],
    [{ dexId: 384, name: 'Rayquaza (Vortex)', types: ['Dragon', 'Flying'] }],
    [{ dexId: 10079, name: 'Mega Rayquaza', types: ['Dragon', 'Flying'] }],
    [{ dexId: 384, name: 'Primal Rayquaza', types: ['Dragon', 'Ancient'] }],
    [{ dexId: 384, name: 'Shiny Mega Rayquaza', types: ['Dragon', 'Cosmic'] }]
  ],
  132: [ // Ditto chain
    [{ dexId: 132, name: 'Ditto', types: ['Normal'] }],
    [{ dexId: 132, name: 'Super Ditto', types: ['Normal'] }],
    [{ dexId: 132, name: 'Hologram Ditto', types: ['Normal', 'Psychic'] }],
    [{ dexId: 132, name: 'Metal Ditto', types: ['Normal', 'Steel'] }],
    [{ dexId: 132, name: 'Ditto Gigantamax', types: ['Normal', 'Cosmic'] }]
  ],
  470: [ // Leafeon chain
    [{ dexId: 470, name: 'Leafeon', types: ['Grass'] }],
    [{ dexId: 470, name: 'Forest Leafeon', types: ['Grass', 'Fairy'] }],
    [{ dexId: 470, name: 'Solar Leafeon', types: ['Grass', 'Solar'] }],
    [{ dexId: 470, name: 'Mega Leafeon', types: ['Grass', 'Fairy'] }],
    [{ dexId: 470, name: 'Leafeon Gigantamax', types: ['Grass'] }]
  ]
};

export function getEvolvedForm(baseDexId: number, points: number): { dexId: number; name: string; types: string[] } {
  const chain = POKEMON_EVOLUTION_CHAINS[baseDexId];
  if (!chain) {
    // If not in our detailed list, fallback to standard database match or first element
    const standard = LIST_POKEMONS.find(p => p.dexId === baseDexId) || LIST_POKEMONS[0];
    return { dexId: standard.dexId, name: standard.name, types: standard.types };
  }

  // Calculate stage index based on increments of 200 points
  const stageIndex = Math.min(4, Math.max(0, Math.floor(points / 200)));
  const options = chain[stageIndex] || chain[chain.length - 1] || chain[0];
  
  // Deterministic random choice based on a seed (we can use points/dexId or just standard rolling if mutating)
  const chosenIndex = Math.floor(Math.random() * options.length);
  return options[chosenIndex] || options[0];
}

