// Current user storage key
const USER_STORAGE_KEY = "canjia_totp_user";

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadUserSession();
    setupEventListeners();
    loadDocuments();
    loadProfiles();
});

// Setup event listeners
function setupEventListeners() {
    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Show login button
    const showLoginBtn = document.getElementById('show-login-btn');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', showLoginSection);
    }

    // Show register button
    const showRegisterBtn = document.getElementById('show-register-btn');
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', showRegisterSection);
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Document form
    const docForm = document.getElementById('doc-form');
    if (docForm) {
        docForm.addEventListener('submit', handleDocumentSubmit);
    }

    // Profile form
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }
}

// Show register section
function showRegisterSection() {
    document.getElementById('register-section').style.display = 'block';
    document.getElementById('signin-section').style.display = 'none';
    document.getElementById('qr-section').style.display = 'none';
}

// Show login section
function showLoginSection() {
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('signin-section').style.display = 'block';
    document.getElementById('qr-section').style.display = 'none';
}

// Handle user registration
function handleRegister(e) {
    e.preventDefault();
    
    const usernameInput = document.getElementById('register-username');
    const registerMessage = document.getElementById('register-message');
    const username = usernameInput.value.trim();
    
    if (!username) {
        registerMessage.textContent = '사용자명을 입력해주세요.';
        registerMessage.style.color = '#e74c3c';
        return;
    }
    
    registerMessage.textContent = '등록 처리 중...';
    registerMessage.style.color = '#666';
    
    fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Show QR code
        document.getElementById('qr-code').src = data.qr_code;
        document.getElementById('secret-key').textContent = data.secret;
        document.getElementById('qr-section').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
        
        registerMessage.textContent = '등록 성공! QR 코드를 스캔하세요.';
        registerMessage.style.color = '#27ae60';
        
        console.log('TOTP 등록 성공:', username);
    })
    .catch(err => {
        console.error('Register error:', err);
        registerMessage.textContent = '등록 실패: ' + err.message;
        registerMessage.style.color = '#e74c3c';
    });
}

// Handle login
function handleLogin(e) {
    e.preventDefault();
    
    const usernameInput = document.getElementById('login-username');
    const codeInput = document.getElementById('totp-code');
    const loginMessage = document.getElementById('login-message');
    
    const username = usernameInput.value.trim();
    const code = codeInput.value.trim();
    
    if (!username || !code) {
        loginMessage.textContent = '사용자명과 인증 코드를 입력해주세요.';
        loginMessage.style.color = '#e74c3c';
        return;
    }
    
    loginMessage.textContent = '인증 처리 중...';
    loginMessage.style.color = '#666';
    
    fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, code: code })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error || !data.success) {
            throw new Error(data.error || '인증 실패');
        }
        
        // Save user to localStorage
        const user = {
            username: username,
            logged_in_at: new Date().toISOString()
        };
        
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        
        // Update UI
        showLoggedInUI(user);
        
        // Load documents and profiles for this user
        loadDocuments();
        loadProfiles();
        
        // Clear input and show success message
        codeInput.value = '';
        loginMessage.textContent = '로그인 성공!';
        loginMessage.style.color = '#27ae60';
        
        console.log('TOTP 로그인 성공:', username);
    })
    .catch(err => {
        console.error('Login error:', err);
        loginMessage.textContent = '로그인 실패: ' + err.message;
        loginMessage.style.color = '#e74c3c';
    });
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
function showLoggedInUI(user) {
    const loginSection = document.getElementById('login-section');
    const profileInfo = document.getElementById('profile-info');
    const workspace = document.getElementById('workspace');
    
    // Update current user display
    const currentUserSpan = document.getElementById('current-user');
    if (currentUserSpan) {
        currentUserSpan.textContent = user.username;
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
            const userDocs = data.filter(doc => doc.user_id === user.username);

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
        user_id: user.username,
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
            const userProfiles = data.filter(p => p.user_id === user.username);

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
        user_id: user.username,
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
