// Configurações do Spotify
const CLIENT_ID = '1ca02f4c12f247de9ef1552f920e191e'; // Substitua pelo seu Client ID
const REDIRECT_URI = window.location.href.includes('localhost') 
    ? 'http://localhost:8000' 
    : 'https://seu-site-deployado.com'; // Atualize com sua URL
const SCOPE = 'user-read-private user-read-email user-top-read user-follow-read user-read-recently-played playlist-read-private';

// Elementos DOM
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userProfile = document.getElementById('user-profile');
const mainContent = document.getElementById('main-content');
const loading = document.getElementById('loading');

// Verificar token na URL
const hash = window.location.hash.substring(1).split('&').reduce((initial, item) => {
    if (item) {
        const parts = item.split('=');
        initial[parts[0]] = decodeURIComponent(parts[1]);
    }
    return initial;
}, {});

window.location.hash = '';

// Armazenar token
if (hash.access_token) {
    localStorage.setItem('spotify_access_token', hash.access_token);
    localStorage.setItem('spotify_token_expiry', Date.now() + (hash.expires_in * 1000));
    loadUserData();
}

// Verificar se há token válido no localStorage
const token = localStorage.getItem('spotify_access_token');
const tokenExpiry = localStorage.getItem('spotify_token_expiry');

if (token && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
    loadUserData();
} else {
    clearAuth();
}

// Event Listeners
loginBtn.addEventListener('click', () => {
    window.location.href = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPE)}&response_type=token&show_dialog=true`;
});

logoutBtn.addEventListener('click', () => {
    clearAuth();
    window.location.reload();
});

// Funções
function clearAuth() {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_token_expiry');
    loginBtn.classList.remove('hidden');
    userProfile.classList.add('hidden');
    mainContent.classList.add('hidden');
}

async function loadUserData() {
    loginBtn.classList.add('hidden');
    loading.classList.remove('hidden');
    
    try {
        const accessToken = localStorage.getItem('spotify_access_token');
        
        // Carregar dados do usuário
        const userData = await fetchSpotifyData('https://api.spotify.com/v1/me');
        displayUserProfile(userData);
        
        // Carregar dados iniciais
        loadTopTracks('short_term');
        
        // Configurar tabs
        setupTabs();
        
        loading.classList.add('hidden');
        userProfile.classList.remove('hidden');
        mainContent.classList.remove('hidden');
    } catch (error) {
        console.error('Error loading user data:', error);
        clearAuth();
        loading.classList.add('hidden');
    }
}

async function fetchSpotifyData(url) {
    const accessToken = localStorage.getItem('spotify_access_token');
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}

function displayUserProfile(user) {
    document.getElementById('user-avatar').src = user.images?.[0]?.url || 'https://i.scdn.co/image/ab6775700000ee8518a0a69c96f8e3167f7a837b';
    document.getElementById('user-name').textContent = user.display_name;
    document.getElementById('profile-image').src = user.images?.[0]?.url || 'https://i.scdn.co/image/ab6775700000ee8518a0a69c96f8e3167f7a837b';
    document.getElementById('profile-name').textContent = user.display_name;
}

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remover active de todos
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Adicionar active ao clicado
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            
            // Carregar conteúdo da tab se necessário
            switch(tabId) {
                case 'top-tracks':
                    const activeTimeRange = document.querySelector('#top-tracks .time-btn.active').getAttribute('data-range');
                    loadTopTracks(activeTimeRange);
                    break;
                case 'top-artists':
                    const activeArtistRange = document.querySelector('#top-artists .time-btn.active').getAttribute('data-range');
                    loadTopArtists(activeArtistRange);
                    break;
                case 'recently-played':
                    loadRecentlyPlayed();
                    break;
                case 'playlists':
                    loadPlaylists();
                    break;
            }
        });
    });
    
    // Configurar botões de tempo
    const timeBtns = document.querySelectorAll('.time-btn');
    timeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remover active de todos no mesmo container
            btn.parentElement.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
            
            // Adicionar active ao clicado
            btn.classList.add('active');
            const range = btn.getAttribute('data-range');
            
            // Determinar qual tab está ativa
            const activeTab = document.querySelector('.tab-content.active').id;
            
            if (activeTab === 'top-tracks') {
                loadTopTracks(range);
            } else if (activeTab === 'top-artists') {
                loadTopArtists(range);
            }
        });
    });
}

async function loadTopTracks(timeRange) {
    try {
        loading.classList.remove('hidden');
        const data = await fetchSpotifyData(`https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=${timeRange}`);
        displayTopTracks(data.items);
        loading.classList.add('hidden');
    } catch (error) {
        console.error('Error loading top tracks:', error);
        loading.classList.add('hidden');
    }
}

function displayTopTracks(tracks) {
    const grid = document.getElementById('top-tracks-grid');
    grid.innerHTML = '';
    
    tracks.forEach(track => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <img src="${track.album.images[0].url}" alt="${track.name}">
            <h3>${track.name}</h3>
            <p>${track.artists.map(artist => artist.name).join(', ')}</p>
        `;
        card.addEventListener('click', () => {
            window.open(track.external_urls.spotify, '_blank');
        });
        grid.appendChild(card);
    });
}

async function loadTopArtists(timeRange) {
    try {
        loading.classList.remove('hidden');
        const data = await fetchSpotifyData(`https://api.spotify.com/v1/me/top/artists?limit=50&time_range=${timeRange}`);
        displayTopArtists(data.items);
        updateArtistStats(data.items.length);
        loading.classList.add('hidden');
    } catch (error) {
        console.error('Error loading top artists:', error);
        loading.classList.add('hidden');
    }
}

function displayTopArtists(artists) {
    const grid = document.getElementById('top-artists-grid');
    grid.innerHTML = '';
    
    artists.forEach(artist => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <img src="${artist.images[0].url}" alt="${artist.name}">
            <h3>${artist.name}</h3>
            <p>${artist.genres.slice(0, 2).join(', ')}</p>
        `;
        card.addEventListener('click', () => {
            window.open(artist.external_urls.spotify, '_blank');
        });
        grid.appendChild(card);
    });
}

async function loadRecentlyPlayed() {
    try {
        loading.classList.remove('hidden');
        const data = await fetchSpotifyData('https://api.spotify.com/v1/me/player/recently-played?limit=50');
        displayRecentlyPlayed(data.items);
        loading.classList.add('hidden');
    } catch (error) {
        console.error('Error loading recently played:', error);
        loading.classList.add('hidden');
    }
}

function displayRecentlyPlayed(tracks) {
    const grid = document.getElementById('recently-played-grid');
    grid.innerHTML = '';
    
    tracks.forEach(item => {
        const track = item.track;
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <img src="${track.album.images[0].url}" alt="${track.name}">
            <h3>${track.name}</h3>
            <p>${track.artists.map(artist => artist.name).join(', ')}</p>
        `;
        card.addEventListener('click', () => {
            window.open(track.external_urls.spotify, '_blank');
        });
        grid.appendChild(card);
    });
}

async function loadPlaylists() {
    try {
        loading.classList.remove('hidden');
        const data = await fetchSpotifyData('https://api.spotify.com/v1/me/playlists?limit=50');
        displayPlaylists(data.items);
        updatePlaylistStats(data.items.length);
        loading.classList.add('hidden');
    } catch (error) {
        console.error('Error loading playlists:', error);
        loading.classList.add('hidden');
    }
}

function displayPlaylists(playlists) {
    const grid = document.getElementById('playlists-grid');
    grid.innerHTML = '';
    
    playlists.forEach(playlist => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <img src="${playlist.images[0]?.url || 'https://i.scdn.co/image/ab67706f00000002ca5a7517156021292e5663a6'}" alt="${playlist.name}">
            <h3>${playlist.name}</h3>
            <p>${playlist.tracks.total} tracks</p>
        `;
        card.addEventListener('click', () => {
            window.open(playlist.external_urls.spotify, '_blank');
        });
        grid.appendChild(card);
    });
}

async function updateArtistStats(count) {
    try {
        const followingData = await fetchSpotifyData('https://api.spotify.com/v1/me/following?type=artist');
        document.getElementById('following-count').textContent = followingData.artists.total;
        document.getElementById('followers-count').textContent = count;
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

function updatePlaylistStats(count) {
    document.getElementById('playlists-count').textContent = count;
}