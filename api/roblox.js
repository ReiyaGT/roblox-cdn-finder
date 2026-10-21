export default async function handler(req, res) {
  // Tambahkan Header CORS agar dapat dipanggil dari frontend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { username, type = 'headshot' } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'Username wajib diisi.' });
  }

  try {
    // 1. Ambil User ID dari Username
    const userRes = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernames: [username],
        excludeBannedUsers: true
      })
    });

    if (!userRes.ok) {
      throw new Error(`Gagal menghubungi Users API Roblox (${userRes.status})`);
    }

    const userData = await userRes.json();
    if (!userData.data || userData.data.length === 0) {
      return res.status(404).json({ error: 'Username tidak ditemukan di Roblox.' });
    }

    const userId = userData.data[0].id;
    const name = userData.data[0].name;
    const displayName = userData.data[0].displayName;

    // 2. Ambil URL Thumbnail rbxcdn dari User ID
    const endpointType = type === 'full' ? 'avatar' : 'avatar-headshot';
    const thumbUrl = `https://thumbnails.roblox.com/v1/users/${endpointType}?userIds=${userId}&size=420x420&format=Png&isCircular=false`;

    const thumbRes = await fetch(thumbUrl);
    if (!thumbRes.ok) {
      throw new Error(`Gagal menghubungi Thumbnails API Roblox (${thumbRes.status})`);
    }

    const thumbData = await thumbRes.json();
    if (!thumbData.data || thumbData.data.length === 0 || !thumbData.data[0].imageUrl) {
      return res.status(500).json({ error: 'Gagal mendapatkan gambar CDN avatar.' });
    }

    const imageUrl = thumbData.data[0].imageUrl;

    // Return data sukses ke frontend
    return res.status(200).json({
      success: true,
      userId,
      name,
      displayName,
      imageUrl
    });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Terjadi kesalahan server.' });
  }
}
