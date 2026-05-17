// 사용자 정보를 저장할 때 사용할 키
const USER_STORAGE_KEY = "canjia_totp_user";

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    loadUserSession(); // 사용자 세션 로드
    setupEventListeners(); // 이벤트 리스너 설정
    loadDocuments(); // 문서 목록 로드
    loadProfiles(); // 프로필 목록 로드
});

// 이벤트 리스너 설정
function setupEventListeners() {
    // 회원가입 폼
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // 1단계 로그인 폼
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginStep1);
    }

    // 2단계 인증 폼
    const twofaForm = document.getElementById('twofa-form');
    if (twofaForm) {
        twofaForm.addEventListener('submit', handleLoginStep2);
    }

    // 로그인 화면으로 돌아가기 버튼
    const showLoginBtn = document.getElementById('show-login-btn');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => showAuthSection('signin'));
    }

    // 회원가입 화면으로 이동 버튼
    const showRegisterBtn = document.getElementById('show-register-btn');
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', () => showAuthSection('register'));
    }
    
    // 2단계 인증 취소 버튼
    const cancelLoginBtn = document.getElementById('cancel-login-btn');
    if(cancelLoginBtn) {
        cancelLoginBtn.addEventListener('click', () => showAuthSection('signin'));
    }

    // 로그아웃 버튼
    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // 문서 작성 폼
    const docForm = document.getElementById('doc-form');
    if (docForm) {
        docForm.addEventListener('submit', handleDocumentSubmit);
    }

    // 프로필 작성 폼
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }
}

// 인증 섹션 표시 (register, signin, twofa)
function showAuthSection(section) {
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('signin-section').style.display = 'none';
    document.getElementById('twofa-section').style.display = 'none';
    
    if(section === 'register') {
        document.getElementById('register-section').style.display = 'block';
        document.getElementById('qr-section').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
    } else if (section === 'signin') {
        document.getElementById('signin-section').style.display = 'block';
    } else if (section === 'twofa') {
        document.getElementById('twofa-section').style.display = 'block';
    }
}

// 회원가입 처리
function handleRegister(e) {
    e.preventDefault();
    
    const usernameInput = document.getElementById('register-username');
    const passwordInput = document.getElementById('register-password');
    const registerMessage = document.getElementById('register-message');
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!username || !password) {
        registerMessage.textContent = '사용자명과 비밀번호를 모두 입력해주세요.';
        registerMessage.style.color = '#e74c3c';
        return;
    }
    
    if (password.length < 6) {
        registerMessage.textContent = '비밀번호는 최소 6자 이상이어야 합니다.';
        registerMessage.style.color = '#e74c3c';
        return;
    }
    
    registerMessage.textContent = '등록 처리 중...';
    registerMessage.style.color = '#666';
    
    fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        
        // QR 코드 표시
        document.getElementById('qr-code').src = data.qr_code;
        document.getElementById('secret-key').textContent = data.secret;
        document.getElementById('qr-section').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
        
        registerMessage.textContent = '등록 성공! QR 코드를 스캔하세요.';
        registerMessage.style.color = '#27ae60';
        
        console.log('회원가입 성공:', username);
    })
    .catch(err => {
        console.error('Register error:', err);
        registerMessage.textContent = '등록 실패: ' + err.message;
        registerMessage.style.color = '#e74c3c';
    });
}

// 1단계 로그인 처리
function handleLoginStep1(e) {
    e.preventDefault();
    
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const loginMessage = document.getElementById('login-message');
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!username || !password) {
        loginMessage.textContent = '사용자명과 비밀번호를 입력해주세요.';
        loginMessage.style.color = '#e74c3c';
        return;
    }
    
    loginMessage.textContent = '로그인 처리 중...';
    loginMessage.style.color = '#666';
    
    fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error || !data.success) {
            throw new Error(data.error || '1단계 로그인 실패');
        }
        
        // 2단계 인증으로 전환
        showAuthSection('twofa');
        loginMessage.textContent = ''; // 메시지 초기화
        
        console.log('1단계 로그인 성공:', username);
    })
    .catch(err => {
        console.error('Login step 1 error:', err);
        loginMessage.textContent = '로그인 실패: ' + err.message;
        loginMessage.style.color = '#e74c3c';
    });
}

// 2단계 로그인 처리 (TOTP 코드 검증)
function handleLoginStep2(e) {
    e.preventDefault();
    
    const codeInput = document.getElementById('totp-code');
    const twofaMessage = document.getElementById('twofa-message');
    const code = codeInput.value.trim();
    
    if (!code) {
        twofaMessage.textContent = '인증 코드를 입력해주세요.';
        twofaMessage.style.color = '#e74c3c';
        return;
    }
    
    twofaMessage.textContent = '인증 처리 중...';
    twofaMessage.style.color = '#666';
    
    fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error || !data.success) {
            throw new Error(data.error || '2단계 인증 실패');
        }
        
        // 사용자 정보 저장
        const user = {
            username: data.username,
            logged_in_at: new Date().toISOString()
        };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        
        // UI 업데이트
        showLoggedInUI(user);
        
        // 데이터 로드
        loadDocuments();
        loadProfiles();
        
        // 입력 초기화 및 성공 메시지
        codeInput.value = '';
        twofaMessage.textContent = '로그인 성공!';
        twofaMessage.style.color = '#27ae60';
        
        console.log('2단계 로그인 성공:', data.username);
    })
    .catch(err => {
        console.error('Login step 2 error:', err);
        twofaMessage.textContent = '인증 실패: ' + err.message;
        twofaMessage.style.color = '#e74c3c';
    });
}

// 사용자 세션 로드
function loadUserSession() {
    const savedProfile = localStorage.getItem(USER_STORAGE_KEY);
    if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        showLoggedInUI(profile);
    } else {
        showLoginUI();
    }
}

// 로그인 UI 표시
function showLoginUI() {
    const loginSection = document.getElementById('login-section');
    const profileInfo = document.getElementById('profile-info');
    const profileForm = document.getElementById('profile-form');

    if (loginSection) loginSection.style.display = 'block';
    if (profileInfo) profileInfo.style.display = 'none';
    if (profileForm) profileForm.style.display = 'none';
    showAuthSection('signin');
}

// 로그인 후 UI 표시
function showLoggedInUI(user) {
    const loginSection = document.getElementById('login-section');
    const profileInfo = document.getElementById('profile-info');
    const profileForm = document.getElementById('profile-form');

    const currentUserSpan = document.getElementById('current-user');
    if (currentUserSpan) {
        currentUserSpan.textContent = user.username;
    }
    
    if (loginSection) loginSection.style.display = 'none';
    if (profileInfo) profileInfo.style.display = 'block';
    if (profileForm) profileForm.style.display = 'block'; 
}

// 로그아웃
function logout() {
    localStorage.removeItem(USER_STORAGE_KEY);
    showLoginUI();
    document.getElementById('document-list').innerHTML = '';
    document.getElementById('profile-list').innerHTML = ''; 
    console.log('로그아웃 완료');
}

// 현재 사용자 가져오기
function getCurrentUser() {
    const savedProfile = localStorage.getItem(USER_STORAGE_KEY);
    return savedProfile ? JSON.parse(savedProfile) : null;
}

// ===== 문서 관리 =====

// 문서 목록 로드
function loadDocuments() {
    const user = getCurrentUser();
    if (!user) return;

    fetch('/api/documents')
        .then(response => response.json())
        .then(data => {
            const docList = document.getElementById('document-list');
            if (!docList) return;

            const userDocs = data.filter(doc => doc.user_id === user.username);

            docList.innerHTML = '';
            if (userDocs.length === 0) {
                docList.innerHTML = '<p style="color: #666;">아직 추가된 문서가 없습니다.</p>';
                return;
            }
            
            const docCount = document.getElementById('doc-count');
            if(docCount) {
                docCount.textContent = `${userDocs.length}개`;
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

// 문서 제출 처리
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

    const documentData = {
        title: title,
        field: field,
        user_id: user.username,
        created_at: new Date().toISOString()
    };

    fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentData)
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

// 문서 삭제
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

// ===== 프로필 관리 =====

// 프로필 목록 로드
function loadProfiles() {
    const user = getCurrentUser();
    if (!user) return;

    fetch('/api/profiles')
        .then(response => response.json())
        .then(data => {
            const profileList = document.getElementById('profile-list');
            if (!profileList) return;

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

// 프로필 제출 처리
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

// 프로필 삭제
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


// 필드 탭 기능
document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.field-tab');
    const selectedKicker = document.getElementById('selected-kicker');
    const workspaceTitle = document.getElementById('workspace-title');
    const selectedDescription = document.getElementById('selected-description');
    const selectedDomain = document.getElementById('selected-domain');
    const selectedGoal = document.getElementById('selected-goal');

    const fieldData = {
        agi: {
            kicker: 'AGI',
            title: 'AGI[범용 인공 지능]',
            description: '사람의 수준에 맞고 사람의 활동 및 외관을 본따서 만든 인공지능입니다.',
            domain: '발전의 영역',
            goal: '기술 증진 · 생명 연장 · 우주 유영'
        },
        actf: {
            kicker: 'ACTF',
            title: 'ACTF[실감 콘텐츠]',
            description: '현실과 유사한 경험을 제공하여 몰입감을 높이는 콘텐츠입니다.',
            domain: '발전의 영역',
            goal: '가상현실 · 증강현실 · 혼합현실'
        },
        swimming: {
            kicker: '수영',
            title: '수영',
            description: '제주도의 자연 속에서 즐기는 수영입니다.',
            domain: '네트워크의 영역',
            goal: '건강 증진 · 커뮤니티 형성'
        },
        skydiving: {
            kicker: '스카이 다이빙',
            title: '스카이 다이빙',
            description: '하늘을 나는 경험을 통해 새로운 도전을 즐깁니다.',
            domain: '네트워크의 영역',
            goal: '도전 정신 · 스트레스 해소'
        },
        climbing: {
            kicker: '암벽 등반',
            title: '암벽 등반',
            description: '제주도의 아름다운 자연 암벽을 등반합니다.',
            domain: '네트워크의 영역',
            goal: '체력 증진 · 성취감 획득'
        },
        cafe: {
            kicker: '카페 취업',
            title: '카페 취업',
            description: '제주도의 특색 있는 카페에서 일하며 경험을 쌓습니다.',
            domain: '네트워크의 영역',
            goal: '경제 자립 · 기술 습득'
        },
        barista: {
            kicker: '기술 연마',
            title: '기술 연마',
            description: '최고의 바리스타가 되기 위한 기술을 연마합니다.',
            domain: '네트워크의 영역',
            goal: '전문성 강화 · 창업 준비'
        }
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // 모든 탭의 active 클래스 제거
            tabs.forEach(t => t.classList.remove('active'));
            // 클릭된 탭에 active 클래스 추가
            tab.classList.add('active');

            const field = tab.dataset.fieldTarget;
            const data = fieldData[field];

            // 선택된 분야 정보 업데이트
            selectedKicker.textContent = data.kicker;
            workspaceTitle.textContent = data.title;
            selectedDescription.textContent = data.description;
            selectedDomain.textContent = data.domain;
            selectedGoal.textContent = data.goal;
            
            // 문서 분야 필터링
            const docFieldSelect = document.getElementById('doc-field');
            if(docFieldSelect) {
                docFieldSelect.value = field;
            }
        });
    });
});
