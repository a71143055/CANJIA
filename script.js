// Current user storage key
const USER_STORAGE_KEY = "canjia_naver_profile";

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadUserSession();
    setupEventListeners();
    loadDocuments();
    loadProfiles();
});

// Setup event listeners
function setupEventListeners() {
    // Naver login button
    const navberLoginBtn = document.getElementById('naver-login-btn');
    if (navberLoginBtn) {
        navberLoginBtn.addEventListener('click', initiateNaverLogin);
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Document form
    const docForm = document.getElementById('document-form');
    if (docForm) {
        docForm.addEventListener('submit', handleDocumentSubmit);
    }

    // Profile form
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }

    // Listen for messages from Naver callback window
    window.addEventListener('message', handleNaverMessage);
}

// Initiate Naver OAuth flow
function initiateNaverLogin() {
    const clientId = NAVER_CONFIG.CLIENT_ID;
    if (clientId === "YOUR_NAVER_CLIENT_ID") {
        alert("네이버 Client ID를 설정해주세요. naver-config.js에서 CLIENT_ID를 수정하세요.");
        return;
    }

    const redirectUri = NAVER_CONFIG.REDIRECT_URI;
    const state = Math.random().toString(36).substring(7);
    
    // Store state for verification
    sessionStorage.setItem('naver_oauth_state', state);
    
    // Open Naver OAuth authorization URL in popup
    const authUrl = `https://nid.naver.com/oauth2.0/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&state=${state}`;
    
    window.open(authUrl, 'naver_oauth', 'width=500,height=600');
}

// Handle message from Naver callback window
function handleNaverMessage(event) {
    // Verify origin
    if (event.origin !== window.location.origin) {
        return;
    }

    if (event.data.type === 'NAVER_LOGIN_SUCCESS') {
        const profile = event.data.profile;
        
        // Save profile to localStorage
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
        
        // Update UI
        showLoggedInUI(profile);
        
        // Load documents and profiles for this user
        loadDocuments();
        loadProfiles();
        
        console.log('네이버 로그인 성공:', profile.name);
    } else if (event.data.type === 'NAVER_LOGIN_ERROR') {
        alert('로그인 실패: ' + event.data.error);
        console.error('Naver login error:', event.data.error);
    }
}

// Load user session from localStorage
function loadUserSession() {
    const savedProfile = localStorage.getItem(USER_STORAGE_KEY);
    if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        showLoggedInUI(profile);
    } else {
        showLoginUI();
    }
}

// Show login UI
function showLoginUI() {
    const loginSection = document.getElementById('login-section');
    const profileInfo = document.getElementById('profile-info');
    const workspace = document.getElementById('workspace');
    
    if (loginSection) loginSection.style.display = 'block';
    if (profileInfo) profileInfo.style.display = 'none';
    if (workspace) workspace.style.display = 'none';
}

// Show logged in UI
function showLoggedInUI(profile) {
    const loginSection = document.getElementById('login-section');
    const profileInfo = document.getElementById('profile-info');
    const workspace = document.getElementById('workspace');
    
    // Update current user display
    const currentUserSpan = document.getElementById('current-user');
    if (currentUserSpan) {
        currentUserSpan.textContent = profile.name || profile.nickname || profile.email;
    }
    
    // Show/hide sections
    if (loginSection) loginSection.style.display = 'none';
    if (profileInfo) profileInfo.style.display = 'block';
    if (workspace) workspace.style.display = 'block';
}

// Logout
function logout() {
    localStorage.removeItem(USER_STORAGE_KEY);
    showLoginUI();
    document.getElementById('document-list').innerHTML = '';
    document.getElementById('profile-list').innerHTML = '';
    console.log('로그아웃 완료');
}

// Get current user
function getCurrentUser() {
    const savedProfile = localStorage.getItem(USER_STORAGE_KEY);
    return savedProfile ? JSON.parse(savedProfile) : null;
}

// ===== DOCUMENT MANAGEMENT =====

// Load documents
function loadDocuments() {
    const user = getCurrentUser();
    if (!user) return;

    fetch('/api/documents')
        .then(response => response.json())
        .then(data => {
            const docList = document.getElementById('document-list');
            if (!docList) return;

            // Filter documents for current user
            const userDocs = data.filter(doc => doc.user_id === user.id);

            docList.innerHTML = '';
            if (userDocs.length === 0) {
                docList.innerHTML = '<p style="color: #666;">아직 추가된 문서가 없습니다.</p>';
                return;
            }

            userDocs.forEach(doc => {
                const docItem = document.createElement('div');
                docItem.className = 'doc-item';
                docItem.style.marginBottom = '10px';
                docItem.innerHTML = `
                    <strong>${doc.title}</strong> 
                    <button onclick="deleteDocument('${doc.id}')" class="button secondary" style="margin-left: 10px;">삭제</button>
                `;
                docList.appendChild(docItem);
            });
        })
        .catch(err => console.error('Failed to load documents:', err));
}

// Handle document form submission
function handleDocumentSubmit(e) {
    e.preventDefault();
    
    const user = getCurrentUser();
    if (!user) {
        alert('먼저 로그인해주세요');
        return;
    }

    const formData = new FormData(e.target);
    const title = formData.get('title');
    const field = formData.get('field') || '';

    if (!title.trim()) {
        alert('문서 제목을 입력해주세요');
        return;
    }

    const document = {
        title: title,
        field: field,
        user_id: user.id,
        created_at: new Date().toISOString()
    };

    fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(document)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('문서 저장 실패: ' + data.error);
        } else {
            console.log('문서 저장 완료:', data);
            e.target.reset();
            loadDocuments();
        }
    })
    .catch(err => {
        console.error('Document save error:', err);
        alert('문서 저장 중 오류 발생');
    });
}

// Delete document
function deleteDocument(docId) {
    if (!confirm('정말로 삭제하시겠습니까?')) return;

    fetch(`/api/documents?id=${docId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('삭제 실패: ' + data.error);
        } else {
            console.log('삭제 완료');
            loadDocuments();
        }
    })
    .catch(err => console.error('Delete error:', err));
}

// ===== PROFILE MANAGEMENT =====

// Load profiles
function loadProfiles() {
    const user = getCurrentUser();
    if (!user) return;

    fetch('/api/profiles')
        .then(response => response.json())
        .then(data => {
            const profileList = document.getElementById('profile-list');
            if (!profileList) return;

            // Filter profiles for current user
            const userProfiles = data.filter(p => p.user_id === user.id);

            profileList.innerHTML = '';
            if (userProfiles.length === 0) {
                profileList.innerHTML = '<p style="color: #666;">저장된 프로필이 없습니다.</p>';
                return;
            }

            userProfiles.forEach(profile => {
                const profileItem = document.createElement('div');
                profileItem.className = 'profile-item';
                profileItem.style.padding = '10px';
                profileItem.style.border = '1px solid #ddd';
                profileItem.style.marginBottom = '10px';
                profileItem.style.borderRadius = '4px';
                profileItem.innerHTML = `
                    <p><strong>관심분야:</strong> ${profile.interests || '미입력'}</p>
                    <p><strong>제주 계획:</strong> ${profile.plan || '미입력'}</p>
                    <button onclick="deleteProfile('${profile.id}')" class="button secondary">삭제</button>
                `;
                profileList.appendChild(profileItem);
            });
        })
        .catch(err => console.error('Failed to load profiles:', err));
}

// Handle profile form submission
function handleProfileSubmit(e) {
    e.preventDefault();

    const user = getCurrentUser();
    if (!user) {
        alert('먼저 로그인해주세요');
        return;
    }

    const formData = new FormData(e.target);
    const interests = formData.get('interests') || '';
    const plan = formData.get('plan') || '';

    const profile = {
        interests: interests,
        plan: plan,
        user_id: user.id,
        created_at: new Date().toISOString()
    };

    fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('프로필 저장 실패: ' + data.error);
        } else {
            console.log('프로필 저장 완료:', data);
            e.target.reset();
            loadProfiles();
        }
    })
    .catch(err => {
        console.error('Profile save error:', err);
        alert('프로필 저장 중 오류 발생');
    });
}

// Delete profile
function deleteProfile(profileId) {
    if (!confirm('정말로 삭제하시겠습니까?')) return;

    fetch(`/api/profiles?id=${profileId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('삭제 실패: ' + data.error);
        } else {
            console.log('프로필 삭제 완료');
            loadProfiles();
        }
    })
    .catch(err => console.error('Delete error:', err));
}
