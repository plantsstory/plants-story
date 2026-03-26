const SUPABASE_URL = 'https://jpgbehsrglsiwijglhjo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZ2JlaHNyZ2xzaXdpamdsaGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMzQwNzAsImV4cCI6MjA4ODkxMDA3MH0.Up-z0b60_81GoLBpzoXZI01mPBSbvUS7t5MbrEWXkXA';

const descriptions = {
  4: { // Anthurium warocqueanum
    body: "T.Mooreが1878年にFlorist & Pomol.にて記載。「アンスリウムの女王」と称される本種は、長さ1m以上にも達する細長い垂れ下がる葉が最大の特徴。葉は深いビロード質の暗緑色で、銀白色の葉脈が美しいコントラストを描く。葉は成長とともに驚くほど長くなり、幼株と成株で印象が大きく異なる。Colombiaの熱帯雲霧林に自生する着生植物。",
    body_en: "Described by T.Moore in 1878 in Florist & Pomol., Anthurium warocqueanum is often called the 'Queen Anthurium' for its spectacular elongated pendulous leaves that can exceed 1 meter in length. The leaves are a deep, velvety dark green adorned with striking silvery-white venation, creating a dramatic visual contrast. As the plant matures, the leaves become remarkably longer, giving juvenile and adult specimens very different appearances. Native to the cloud forests of Colombia, it grows as an epiphyte in humid, elevated tropical environments."
  },
  6: { // Anthurium veitchii
    body: "Mast.が1876年にGard. Chron.にて記載。「アンスリウムの王」と呼ばれ、長さ90cm以上に達する巨大な葉が特徴。葉の表面には深い波状のひだ（コルゲーション）が規則的に並び、他のアンスリウムにはない独特の質感を持つ。葉色は明るい緑色で、光沢がある。Colombiaの熱帯雨林に自生する着生植物で、高湿度の環境を好む。",
    body_en: "Described by Mast. in 1876 in Gard. Chron., Anthurium veitchii is known as the 'King Anthurium' for its impressive, lance-shaped leaves that can reach over 90cm in length. The most distinctive feature is the deeply corrugated (rippled) leaf surface, with regular undulations that give the foliage a dramatic, textured appearance unlike any other Anthurium. The leaves are a bright, glossy green. Native to the tropical rainforests of Colombia, it grows as an epiphyte in high-humidity environments."
  },
  9: { // Anthurium clarinervium
    body: "Matudaが1952年にAnales Inst. Biol. Univ. Nac. Méxicoにて記載。厚みのあるハート型の葉が特徴で、深緑色のビロード質の葉面に銀白色の太い葉脈が力強く走る。葉のサイズは幅20-30cm程度で、革質で丈夫。他のビロード系アンスリウムと比べてコンパクトに育つ。Mexico南東部のチアパス州の石灰岩地帯に自生する地生植物で、比較的乾燥に強い。",
    body_en: "Described by Matuda in 1952 in Anales Inst. Biol. Univ. Nac. México. Distinguished by its thick, heart-shaped leaves with a velvety dark green surface and bold, silvery-white venation. Leaves reach about 20-30cm in width with a leathery, sturdy texture. Compared to other velvet-leaved Anthuriums, it stays relatively compact. Native to limestone karst regions of southeastern Mexico (Chiapas), it is a terrestrial species that tolerates drier conditions better than most of its relatives."
  },
  10: { // Anthurium magnificum
    body: "Lindenが1865年にGard. Chron.にて記載。大型のハート型の葉を持ち、濃い緑色のビロード質の葉面に白い葉脈が鮮明に浮かぶ。A. crystallinumに似るが、葉柄の断面が四角形である点で区別される。葉は幅30cm以上に成長し、新葉は赤褐色を帯びて展開する。Colombiaの熱帯雨林の林床付近に自生する地生植物。",
    body_en: "Described by Linden in 1865 in Gard. Chron. This species features large, heart-shaped leaves with a velvety dark green surface and prominent white venation. While similar in appearance to A. crystallinum, it is distinguished by its quadrangular (not round) petiole cross-section. Leaves can exceed 30cm in width, and new leaves emerge with a reddish-brown tinge. Native to the tropical rainforests of Colombia, it grows as a terrestrial plant near the forest floor."
  },
  11: { // Anthurium forgetii
    body: "N.E.Br.が1906年にGard. Chron.にて記載。他のアンスリウムと異なり、葉の基部に切れ込み（サイナス）がなく、涙滴型の独特な葉形が最大の特徴。葉は光沢のある暗緑色で、銀色の細かい葉脈パターンが散りばめられる。葉裏は紫がかることもある。比較的小型で、葉は長さ15-25cm程度。Colombiaの熱帯雨林に自生する着生植物。",
    body_en: "Described by N.E.Br. in 1906 in Gard. Chron. Unlike most Anthuriums, this species lacks the basal sinus (notch) typical of heart-shaped aroid leaves, instead displaying a distinctive teardrop or oval leaf shape. The leaves are glossy dark green with fine silvery venation scattered across the surface. The leaf underside may show a purplish hue. A relatively compact species with leaves reaching 15-25cm in length. Native to the tropical rainforests of Colombia, growing as an epiphyte."
  },
  13: { // Monstera deliciosa
    body: "Liebm.が記載した、世界で最も知られるサトイモ科植物のひとつ。成熟した葉は幅60-90cmに達し、特徴的な深い切れ込みと穴（フェネストレーション）を持つ。幼葉はハート型で切れ込みがなく、成長とともに劇的に形が変化する。太い気根を伸ばして他の樹木に登る半着生植物。Guatemala、Mexico南部の熱帯雨林が原産で、現在は世界中の熱帯地域に帰化している。",
    body_en: "Described by Liebm., Monstera deliciosa is one of the world's most recognizable aroids. Mature leaves can reach 60-90cm in width, featuring the characteristic deep splits and holes (fenestrations) that give it the common name 'Swiss cheese plant.' Juvenile leaves are heart-shaped and entire, transforming dramatically as the plant matures. A hemiepiphyte that produces thick aerial roots to climb trees. Native to the tropical rainforests of Guatemala and southern Mexico, it has since naturalized throughout tropical regions worldwide."
  },
  14: { // Monstera adansonii
    body: "Schottが1830年にWiener Z. Kunstにて記載。M. deliciosaより小型で、葉は長さ20-40cmの楕円形。葉全体に不規則な楕円形の穴（フェネストレーション）が多数開くのが最大の特徴で、葉の縁までは達しない。成長が早く、つる性で気根を伸ばして他の植物に巻きつく。中南米の広い範囲（Surinameからbolivia、Brazilまで）の熱帯雨林に自生する。",
    body_en: "Described by Schott in 1830 in Wiener Z. Kunst. Smaller than M. deliciosa, with elliptical leaves reaching 20-40cm long. Its most distinctive feature is the numerous irregular oval fenestrations (holes) scattered throughout the leaf blade, which unlike M. deliciosa do not extend to the leaf margin. A fast-growing climbing vine that produces aerial roots. Native to a wide range of tropical rainforests across Central and South America, from Suriname to Bolivia and Brazil."
  },
  17: { // Monstera obliqua
    body: "Miq.が1844年にLinnaeaにて記載。「最も穴の多い植物」として知られ、成熟した葉は葉肉よりも穴の面積が大きくなることがある、極めて珍しい種。葉は薄く繊細で、長さ10-25cm程度。M. adansoniiと混同されやすいが、本種の方が遥かに希少で葉が薄い。Bolivia、Venezuela、Ecuador、Colombiaなど中南米の熱帯雨林に自生する着生植物。",
    body_en: "Described by Miq. in 1844 in Linnaea. Known as the 'most holey plant,' mature leaves of Monstera obliqua can have more hole than leaf tissue, making it one of the most remarkable species in the aroid family. Leaves are thin and delicate, reaching 10-25cm in length. Often confused with M. adansonii, but M. obliqua is far rarer and has much thinner leaves. Native to tropical rainforests across Central and South America, including Bolivia, Venezuela, Ecuador, and Colombia."
  },
  18: { // Monstera siltepecana
    body: "Matudaが1950年にRevista Soc. Mex. Hist. Nat.にて記載。幼株と成株で葉の外見が劇的に異なるシングル・フェネストレーション種。幼葉は銀色がかった青緑色で、濃い緑の葉脈が目立つ美しいコントラストを見せる。成熟すると葉は大きく緑色になり、フェネストレーション（穴）が現れる。Honduras、Nicaragua、Mexicoなど中米の熱帯雨林に自生するつる性の着生植物。",
    body_en: "Described by Matuda in 1950 in Revista Soc. Mex. Hist. Nat. A species showing dramatic differences between juvenile and mature forms. Juvenile leaves display a striking silvery blue-green color with dark green veins, creating a beautiful two-toned appearance. As the plant matures, leaves become larger, greener, and develop fenestrations. A climbing epiphyte native to the tropical rainforests of Central America, including Honduras, Nicaragua, and Mexico."
  },
  19: { // Monstera dubia
    body: "(Kunth) Engl. & K.Krauseが1908年にPflanzenr.にて記載。幼株は「シングリング」と呼ばれる特異な成長様式で知られ、小さな銀色と緑色のまだら模様の葉を樹幹に密着させて瓦状に並べる。成熟すると葉は大きくなり、フェネストレーション（穴）のある典型的なモンステラの姿に変化する。Peru、Ecuador、Colombia、Guatemalaなど中南米の広い範囲の熱帯雨林に自生する。",
    body_en: "Described by (Kunth) Engl. & K.Krause in 1908 in Pflanzenr. The juvenile form is known for its remarkable 'shingling' growth habit, where small, silvery-green mottled leaves press flat against tree trunks in an overlapping pattern. As the plant matures, it transitions into a typical Monstera form with larger leaves featuring fenestrations. Native to a wide range of tropical rainforests across Central and South America, including Peru, Ecuador, Colombia, and Guatemala."
  },
  20: { // Monstera standleyana
    body: "G.S.Buntingが1967年にBaileyaにて記載。他のモンステラと異なり、成熟しても葉に穴が開かない珍しい種。葉は長楕円形で、濃緑色の地にクリーム色や白色の斑点・斑模様が散りばめられる。この自然な斑入り模様が本種の最大の魅力。つる性で気根を伸ばして登る。Nicaragua、Colombia、Panamá、Costa Ricaの熱帯雨林に自生する。",
    body_en: "Described by G.S.Bunting in 1967 in Baileya. Unlike most Monstera species, this one does not develop fenestrations even at maturity. Leaves are elongated-elliptical with a dark green base color adorned with cream or white speckles and variegation — a naturally occurring pattern that is the species' most distinctive feature. A climbing vine that produces aerial roots. Native to the tropical rainforests of Nicaragua, Colombia, Panamá, and Costa Rica."
  },
  22: { // Philodendron gloriosum
    body: "Andréが記載。大型のハート型の葉を持つ地生性フィロデンドロンで、ビロード質の深緑色の葉面に白〜ピンク色の太い葉脈が走る。新葉はピンクがかった白い葉脈で展開し、成熟とともに白くなる。他のフィロデンドロンと異なり、茎は地面を這って伸びる（匍匐茎）。葉は幅40-50cmに達する。Colombiaの熱帯雨林の林床に自生する。",
    body_en: "Described by André, Philodendron gloriosum is a terrestrial Philodendron with large, heart-shaped, velvety dark green leaves featuring bold white to pink veins. New leaves unfurl with pinkish-white veins that lighten to white as they mature. Unlike most Philodendrons, it has a creeping rhizome that crawls along the ground rather than climbing. Leaves can reach 40-50cm in width. Native to the forest floor of tropical rainforests in Colombia."
  },
  23: { // Philodendron melanochrysum
    body: "Linden & Andréが記載。「黒金のフィロデンドロン」の意味を持つ学名の通り、暗い緑色〜黒みがかったビロード質の葉に、金色に光る微細な結晶質の斑点が散りばめられる。葉は細長いハート型で、成熟すると長さ60cm以上に達する。つる性の着生植物で、気根を伸ばして他の樹木を登る。Colombiaの熱帯雲霧林に自生する。",
    body_en: "Described by Linden & André. The name 'melanochrysum' means 'black gold,' perfectly describing the dark green to almost black velvety leaves sprinkled with tiny golden, crystalline sparkles. Leaves are elongated heart-shaped, reaching over 60cm in length at maturity. A climbing epiphyte that uses aerial roots to ascend trees. Native to the cloud forests of Colombia, where it thrives in cool, humid conditions at higher elevations."
  },
  25: { // Philodendron verrucosum
    body: "L.Mathieu ex Schottが1856年にSyn. Aroid.にて記載。ハート型のビロード質の葉を持ち、葉面は暗緑色で明るい黄緑色の葉脈が際立つ。最大の特徴は葉柄で、緑色の地に赤褐色の毛状突起（イボ状突起）が密生する。葉裏は赤紫色を帯びる。つる性の着生植物。Panamá、Costa Rica、Peru、Colombia、Ecuadorの熱帯雲霧林に自生する。",
    body_en: "Described by L.Mathieu ex Schott in 1856 in Syn. Aroid. Features heart-shaped, velvety leaves with a dark green surface highlighted by bright yellow-green veins. The most distinctive feature is its petiole, covered in dense reddish-brown pubescent bumps (verrucae) — giving the species its name. Leaf undersides show a reddish-purple coloration. A climbing epiphyte native to the cloud forests of Panamá, Costa Rica, Peru, Colombia, and Ecuador."
  },
  28: { // Philodendron squamiferum
    body: "Poepp.が記載。5裂する掌状の葉を持つ珍しいフィロデンドロンで、葉は深い緑色で光沢がある。最大の特徴は赤い毛状の鱗片（スカミフェルム＝鱗を持つ、の意）に覆われた葉柄で、他のフィロデンドロンにはない独特の外見を持つ。つる性の半着生植物で、気根を伸ばして樹木を登る。Brazil北部、Suriname、French Guianaの熱帯雨林に自生する。",
    body_en: "Described by Poepp., Philodendron squamiferum is a distinctive species with deeply 5-lobed, palmate leaves — unusual among Philodendrons. Leaves are a glossy deep green. Its most striking feature is the red, hairy, scale-like pubescence covering the petioles — the name 'squamiferum' means 'bearing scales.' A climbing hemiepiphyte that produces aerial roots. Native to the tropical rainforests of northern Brazil, Suriname, and French Guiana."
  },
  // Cultivars - add plant descriptions
  2: { // King of Spades
    body: "由来は不明。暗い色調の大型の葉が特徴的なアンスリウムのクローン品種。濃い緑色〜ほぼ黒色のビロード質の葉を持ち、葉はスペード型で先端が尖る。成熟した葉は長さ30-40cmに達し、コンパクトな株姿を保つ。",
    body_en: "Origin unknown. A clone cultivar of Anthurium characterized by its large, dark-toned leaves. Features deep green to nearly black velvety foliage with a spade-shaped form and pointed tips. Mature leaves reach 30-40cm in length while maintaining a compact growth habit."
  },
  5: { // Dark Mama
    body: "由来は不明。非常に暗い色調の葉を持つアンスリウムのクローン品種。葉は濃い緑色〜チョコレート色のビロード質で、成熟するとほぼ黒色に見える。ハート型の葉に白い葉脈が走り、ダークカラーとのコントラストが美しい。",
    body_en: "Origin unknown. A clone cultivar of Anthurium with exceptionally dark-toned foliage. Leaves are velvety deep green to chocolate-colored, appearing nearly black when mature. Heart-shaped leaves feature white venation that creates a striking contrast against the dark background."
  },
  7: { // Ace of Spades
    body: "由来は不明。A. crystallinumとA. magnificumの交配種とされることがあるが、正式な記録はない。暗い色合いのビロード質のハート型の葉に、銀白色の葉脈が美しく走る。葉は厚みがあり、革質。比較的コンパクトに育つ。",
    body_en: "Origin unknown. Sometimes claimed to be a hybrid of A. crystallinum and A. magnificum, but no formal records exist. Features dark, velvety heart-shaped leaves with striking silvery-white venation. Leaves are thick and leathery. Grows relatively compact."
  },
  8: { // Queen of Hearts
    body: "由来は不明。大型のハート型の葉を持つアンスリウムの交配種。ビロード質の深緑色の葉面に銀白色の葉脈が広がり、A. magnificumに似た雰囲気を持つ。成熟すると葉は幅30cm以上になる。",
    body_en: "Origin unknown. A hybrid Anthurium with large heart-shaped leaves. Features velvety dark green foliage with silvery-white venation, reminiscent of A. magnificum. Mature leaves exceed 30cm in width."
  },
  15: { // Thai Constellation
    body: "由来は不明だが、タイの研究機関で組織培養により作出されたとされるM. deliciosaの斑入り品種。クリーム色〜黄色の斑が星座のように葉全体に散りばめられるのが特徴。斑の入り方は安定しており、組織培養で増殖される。成熟した葉にはM. deliciosaと同様のフェネストレーションが現れる。",
    body_en: "Origin uncertain, but reportedly developed through tissue culture at a laboratory in Thailand. A variegated cultivar of M. deliciosa featuring cream to yellow speckles scattered across the leaves like a constellation — hence the name. The variegation is relatively stable and the plant is propagated through tissue culture. Mature leaves develop the characteristic fenestrations of M. deliciosa."
  },
  16: { // Albo Variegata
    body: "由来は不明。M. deliciosaの白斑入り変異体で、純白〜クリーム色のセクター状の大きな斑が入る。斑の入り方は不安定で、葉ごとに異なるパターンを見せる。半分白・半分緑の「ハーフムーン」の葉が特に人気がある。茎挿しで増殖される。",
    body_en: "Origin unknown. A white-variegated mutation of M. deliciosa featuring large, sectoral patches of pure white to cream coloration. The variegation is unstable, with each leaf showing a different pattern. 'Half-moon' leaves — half white, half green — are particularly sought after. Propagated through stem cuttings."
  },
  21: { // Aurea
    body: "由来は不明。M. deliciosaの黄色斑入り変異体で、黄色〜ライムグリーンのセクター状の斑が入る。Albo Variegataの白斑に対し、本品種は温かみのある黄色の斑が特徴。斑の入り方は不安定で、個体差が大きい。",
    body_en: "Origin unknown. A yellow-variegated mutation of M. deliciosa featuring sectoral patches of yellow to lime-green coloration. In contrast to the white variegation of 'Albo Variegata,' this cultivar shows warm yellow tones. The variegation is unstable with significant variation between individual plants."
  },
  24: { // Glorious
    body: "由来は不明だが、P. gloriosumとP. melanochrysumの交配種として広く知られる。両親の特徴を併せ持ち、ビロード質の暗緑色の細長いハート型の葉に白い葉脈が走る。P. gloriosumの匍匐性とP. melanochrysumのつる性の中間的な性質を持つ。",
    body_en: "Origin formally unknown, but widely recognized as a hybrid of P. gloriosum and P. melanochrysum. Combines traits of both parents: velvety dark green, elongated heart-shaped leaves with white venation. Shows intermediate growth habits between the terrestrial P. gloriosum and the climbing P. melanochrysum."
  },
  26: { // El Choco Red
    body: "由来は不明。Colombia Chocó地方に由来するとされるフィロデンドロンで、2022年にCroat & KaufmannによりP. rubrijuvenileとして正式記載された可能性がある。新葉が鮮やかな赤色で展開し、成熟とともに深緑色に変化するのが最大の特徴。ハート型のビロード質の葉を持つ。",
    body_en: "Origin uncertain. A Philodendron reportedly originating from the Chocó region of Colombia, potentially formally described as P. rubrijuvenile by Croat & Kaufmann in 2022. The most striking feature is its new leaves, which emerge in a vivid red color before maturing to deep green. Features heart-shaped, velvety leaves."
  },
  27: { // Splendid
    body: "由来は不明だが、P. melanochrysumとP. verrucosumの交配種として広く知られる。両親の特徴を受け継ぎ、ビロード質の暗緑色のハート型の葉に明るい葉脈が走り、葉柄にはP. verrucosumに似た毛状突起が見られることがある。大型になり、つる性で育つ。",
    body_en: "Origin formally unknown, but widely recognized as a hybrid of P. melanochrysum and P. verrucosum. Inherits traits from both parents: velvety dark green heart-shaped leaves with lighter venation, and petioles that may show pubescent bumps reminiscent of P. verrucosum. Grows large as a climbing vine."
  },
  29: { // Pink Princess
    body: "由来は不明。P. erubescensの斑入り変異体で、暗緑色〜ほぼ黒色の葉にピンク色のセクター状の斑が入る。斑の入り方は不安定で、個体や環境条件により異なる。新葉は赤みがかった色で展開する。つる性で、支柱に沿って上に向かって成長する。",
    body_en: "Origin unknown. A variegated cultivar of P. erubescens featuring pink sectoral variegation against dark green to near-black foliage. The variegation is unstable, varying between individual plants and growing conditions. New leaves emerge with a reddish tinge. A climbing vine that grows upward along support structures."
  },
  30: { // Majestic
    body: "由来は不明だが、P. verrucosumとP. sodiroiの交配種として知られる。大型のハート型のビロード質の葉を持ち、暗緑色の葉面に明るい葉脈が走る。葉柄にはP. verrucosumに似た毛状突起がある。つる性で、気根を伸ばして成長する。",
    body_en: "Origin formally unknown, but recognized as a hybrid of P. verrucosum and P. sodiroi. Features large, heart-shaped, velvety leaves with a dark green surface and lighter venation. Petioles show pubescent bumps inherited from P. verrucosum. A climbing vine that produces aerial roots."
  },
};

async function update() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/cultivars?select=id,cultivar_name,origins&order=id`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const cultivars = await res.json();

  let updated = 0;
  for (const c of cultivars) {
    const desc = descriptions[c.id];
    if (!desc) continue;

    const origins = c.origins || [];
    if (origins.length === 0) continue;

    origins[0].body = desc.body;
    origins[0].body_en = desc.body_en;

    const upd = await fetch(`${SUPABASE_URL}/rest/v1/cultivars?id=eq.${c.id}`, {
      method: 'PATCH',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ origins })
    });
    console.log(`[${c.id}] ${c.cultivar_name}: ${upd.status === 204 ? '✅' : '❌ ' + upd.status}`);
    updated++;
  }
  console.log(`\n=== Updated ${updated} cultivars ===`);
}

update();
