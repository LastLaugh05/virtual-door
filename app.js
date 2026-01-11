const DB = { USERS: 'vd_users', APPTS: 'vd_appts', CURRENT: 'vd_curr' };

// 🔥 INIT DATA (Updated Admin Email)
if (!localStorage.getItem(DB.USERS)) { 
    localStorage.setItem(DB.USERS, JSON.stringify([
        { 
            uid: 'admin1', 
            name: 'Admin', 
            email: 'utsharudra@gmail.com', // ✅ UPDATED EMAIL
            pass: '123456', 
            role: 'admin', 
            approved: true 
        }
    ])); 
    localStorage.setItem(DB.APPTS, JSON.stringify([])); 
}

// Helpers
const getUsers = () => JSON.parse(localStorage.getItem(DB.USERS));
const saveUsers = (u) => localStorage.setItem(DB.USERS, JSON.stringify(u));
const getAppts = () => JSON.parse(localStorage.getItem(DB.APPTS));
const saveAppts = (a) => { localStorage.setItem(DB.APPTS, JSON.stringify(a)); window.dispatchEvent(new Event('storage')); };
const getCurr = () => JSON.parse(localStorage.getItem(DB.CURRENT));
const elm = (id) => document.getElementById(id);

// Nav
const views = ['view-login', 'view-signup', 'view-student', 'view-faculty', 'view-admin'];
const show = (id) => {
    views.forEach(v => { const e = elm(v); if(e) e.classList.add('hidden'); }); 
    const t = elm(id); if(t) t.classList.remove('hidden'); 
};

function checkAuth() { 
    const u = getCurr(); 
    if (!u) return show('view-login'); 
    if (u.role === 'faculty' && !u.approved) { 
        alert("Account pending Admin approval."); 
        localStorage.removeItem(DB.CURRENT);
        show('view-login');
        return; 
    } 
    if (u.role === 'student') { 
        show('view-student'); 
        loadStudent(u); 
    } else if (u.role === 'faculty') { 
        show('view-faculty'); 
        loadFaculty(u); 
    } else if (u.role === 'admin') { 
        show('view-admin'); 
        loadAdmin(); 
    } 
}

// Auth Listeners
elm('btn-login').addEventListener('click', () => { 
    const u = getUsers().find(x => x.email === elm('login-email').value && x.pass === elm('login-pass').value); 
    if (u) { 
        localStorage.setItem(DB.CURRENT, JSON.stringify(u)); 
        checkAuth(); 
    } else alert("Invalid Login"); 
});

// SIGNUP ROLE SWITCHER
elm('signup-role').addEventListener('change', (e) => {
    const role = e.target.value;
    if (role === 'student') {
        elm('signup-program').classList.remove('hidden');
        elm('signup-dept').classList.add('hidden');
    } else {
        elm('signup-program').classList.add('hidden');
        elm('signup-dept').classList.remove('hidden');
    }
});

// SIGNUP LOGIC
elm('btn-signup').addEventListener('click', () => {
    const name = elm('signup-name').value;
    const email = elm('signup-email').value;
    const pass = elm('signup-pass').value;
    const role = elm('signup-role').value;
    const program = role === 'student' ? elm('signup-program').value : '';
    const dept = role === 'faculty' ? elm('signup-dept').value : '';

    if (!name || !email || !pass) return alert("Please fill all fields.");
    if (role === 'student' && !program) return alert("Please enter Program.");
    if (role === 'faculty' && !dept) return alert("Please enter Department.");

    const users = getUsers(); 
    if(users.find(u => u.email === email)) return alert("Email taken");
    
    users.push({ 
        uid: 'u'+Date.now(), 
        name, 
        email, 
        pass, 
        role, 
        program, 
        dept, 
        approved: role !== 'faculty', 
        phone: '', 
        building: '', 
        room: '', 
        scheduleData: {} 
    });
    saveUsers(users); 
    alert("Created! Please Login."); 
    show('view-login');
});

// Logout & Navigation
document.querySelectorAll('.btn-logout').forEach(b => b.addEventListener('click', () => { 
    localStorage.removeItem(DB.CURRENT); 
    checkAuth(); 
}));
elm('link-create-acct').addEventListener('click', () => show('view-signup'));
elm('link-back-login').addEventListener('click', () => show('view-login'));

// FACULTY LOGIC
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function loadFaculty(user) {
    elm('fac-name').value = user.name; 
    elm('fac-email').value = user.email;
    elm('fac-dept').value = user.dept || ''; 

    // Show phone/building/room only if approved
    elm('fac-phone').value = user.approved ? (user.phone || '') : 'Hidden until approval';
    elm('fac-building').value = user.approved ? (user.building || '') : 'Hidden until approval';
    elm('fac-room').value = user.approved ? (user.room || '') : 'Hidden until approval';

    // Disable fields if not approved
    elm('fac-phone').disabled = !user.approved;
    elm('fac-building').disabled = !user.approved;
    elm('fac-room').disabled = !user.approved;

    renderScheduleBuilder(user.scheduleData || {}); 
    renderRequests(user.uid);
    toggleEdit(false);
}

window.toggleEdit = (on) => {
    const fields = ['fac-name', 'fac-email', 'fac-dept', 'fac-phone', 'fac-building', 'fac-room'];
    fields.forEach(id => { const el = elm(id); if(el) el.disabled = !on; });
    DAYS.forEach(day => {
        elm(`check-${day}`).disabled = !on;
        ['sH','sM','sAp','eH','eM','eAp'].forEach(prefix => elm(`${prefix}-${day}`).disabled = !on);
    });
    elm('btn-fac-edit').classList.toggle('hidden', on);
    elm('btn-fac-save').classList.toggle('hidden', !on);
};

window.saveProfile = () => {
    const curr = getCurr(); 
    const users = getUsers(); 
    const idx = users.findIndex(u => u.uid === curr.uid);
    if (idx !== -1) {
        users[idx].name = elm('fac-name').value;
        users[idx].email = elm('fac-email').value;
        users[idx].dept = elm('fac-dept').value;
        users[idx].phone = elm('fac-phone').value;
        users[idx].building = elm('fac-building').value;
        users[idx].room = elm('fac-room').value;
        
        const schedData = {};
        let schedString = "";
        DAYS.forEach(day => {
            const active = elm(`check-${day}`).checked;
            const sH = elm(`sH-${day}`).value, sM = elm(`sM-${day}`).value, sAp = elm(`sAp-${day}`).value;
            const eH = elm(`eH-${day}`).value, eM = elm(`eM-${day}`).value, eAp = elm(`eAp-${day}`).value;
            schedData[day] = { active, sH, sM, sAp, eH, eM, eAp };
            if(active) { 
                schedString += `${day}: ${sH}:${sM} ${sAp} - ${eH}:${eM} ${eAp}\n`; 
            }
        });
        users[idx].scheduleData = schedData;
        users[idx].schedule = schedString; 
        
        saveUsers(users); 
        localStorage.setItem(DB.CURRENT, JSON.stringify(users[idx])); 
        alert("Saved!"); 
        toggleEdit(false);
    }
};

function renderScheduleBuilder(savedData) {
    const container = elm('schedule-builder'); 
    container.innerHTML = ''; 
    DAYS.forEach(day => {
        const d = savedData[day] || { active: false, sH: '09', sM: '00', sAp: 'AM', eH: '05', eM: '00', eAp: 'PM' };
        const row = document.createElement('div');
        row.className = 'sched-row'; 
        row.id = `row-${day}`;
        row.innerHTML = `
            <div class="day-label">${day}</div>
            <label class="toggle-switch">
                <input type="checkbox" id="check-${day}" ${d.active ? 'checked' : ''} onchange="toggleRow('${day}')" disabled>
                <span class="slider"></span>
            </label>
            ${makeSelect(`sH-${day}`, 1, 12, d.sH)}<span class="sep">:</span>${makeSelect(`sM-${day}`, 0, 59, d.sM, true)}${makeAmPm(`sAp-${day}`, d.sAp)}
            <span class="sep">to</span>
            ${makeSelect(`eH-${day}`, 1, 12, d.eH)}<span class="sep">:</span>${makeSelect(`eM-${day}`, 0, 59, d.eM, true)}${makeAmPm(`eAp-${day}`, d.eAp)}
        `;
        container.appendChild(row); 
        toggleRow(day, false); 
    });
}

function makeSelect(id, min, max, val, isMin=false) {
    let opts = ''; 
    for(let i=min; i<=max; i++) { 
        let txt = i < 10 ? '0'+i : i; 
        opts += `<option value="${txt}" ${txt==val?'selected':''}>${txt}</option>`; 
    }
    return `<select id="${id}" class="time-box" disabled>${opts}</select>`;
}

function makeAmPm(id, val) {
    return `<select id="${id}" class="time-box ampm-box" disabled>
        <option value="AM" ${val=='AM'?'selected':''}>AM</option>
        <option value="PM" ${val=='PM'?'selected':''}>PM</option>
    </select>`;
}

window.toggleRow = (day, manual=true) => {
    const on = elm(`check-${day}`).checked; 
    const row = elm(`row-${day}`); 
    if(row) row.style.opacity = on ? '1' : '0.5';
};

function renderRequests(fid) {
    const list = elm('faculty-appt-list'); 
    const reqs = getAppts().filter(a => a.facultyId === fid && a.status === 'pending');
    list.innerHTML = ''; 
    if (reqs.length === 0) list.innerHTML = '<p style="text-align:center; color:#888;">No requests.</p>';
    reqs.forEach(r => { 
        list.innerHTML += `
            <div class="req-card">
                <strong>${r.studentName}</strong> <span style="font-size:0.8rem; color:#2563eb; background:#e0f2fe; padding:2px 6px; border-radius:4px;">(${r.studentProgram || 'N/A'})</span>
                <br><small>${r.msg}</small>
                <div class="req-actions">
                    <button class="btn-dismiss" onclick="decide('${r.id}','rejected')">Dismiss</button>
                    <button class="btn-approve" onclick="decide('${r.id}','approved')">Approve</button>
                </div>
            </div>`; 
    });
}

window.decide = (id, s) => { 
    const a = getAppts(); 
    const t = a.find(x => x.id == id); 
    if(t) { 
        t.status = s; 
        saveAppts(a); 
        renderRequests(t.facultyId); 
    } 
};

// STUDENT
function loadStudent(user) {
    elm('student-program-display').textContent = `Program: ${user.program || 'N/A'}`;
    const sel = elm('student-faculty-list'); 
    sel.innerHTML = '<option value="">-- Select Professor --</option>';
    getUsers().filter(u => u.role === 'faculty' && u.approved).forEach(f => { 
        sel.innerHTML += `<option value="${f.uid}">${f.name} (${f.dept||'Faculty'})</option>`; 
    });
    renderStudentHistory(user.uid);
}

elm('student-faculty-list').addEventListener('change', (e) => {
    const fid = e.target.value; 
    const box = elm('student-fac-schedule-display');
    if(!fid) { 
        box.classList.add('hidden'); 
        return; 
    }
    const fac = getUsers().find(u => u.uid === fid);
    if(fac && fac.schedule) { 
        box.classList.remove('hidden'); 
        box.textContent = `📅 PROFESSOR'S SCHEDULE:\n${fac.schedule}\n📞 Phone: ${fac.phone || 'Not provided'}`;
    } else { 
        box.classList.add('hidden'); 
    }
});

function renderStudentHistory(uid) {
    const list = elm('student-history-list'); 
    list.innerHTML = '';
    const my = getAppts().filter(a => a.studentId === uid).reverse();
    if(my.length === 0) list.innerHTML = '<li>No requests.</li>';
    my.forEach(a => { 
        let c = a.status === 'approved' ? '#2ecc71' : (a.status === 'rejected' ? '#e74c3c' : '#f39c12'); 
        list.innerHTML += `<li>${a.msg} <b style="color:${c}">${a.status.toUpperCase()}</b></li>`; 
    });
}

elm('btn-book').addEventListener('click', () => {
    const fid = elm('student-faculty-list').value, msg = elm('booking-msg').value;
    if(!fid || !msg) return alert("Fill details");
    const a = getAppts(), u = getCurr();
    a.push({ id: Date.now(), studentId: u.uid, studentName: u.name, studentProgram: u.program, facultyId: fid, msg, status: 'pending' });
    saveAppts(a); 
    alert("Request Sent!"); 
    elm('booking-msg').value = ''; 
    renderStudentHistory(u.uid);
});

// ADMIN
function loadAdmin() {
    const list = elm('admin-faculty-list'); 
    list.innerHTML = '';
    const p = getUsers().filter(u => u.role === 'faculty' && !u.approved);
    if(p.length === 0) list.innerHTML = '<li>No pending approvals.</li>';
    p.forEach(u => list.innerHTML += `<li>${u.name} <button class="btn-approve" onclick="approve('${u.uid}')">Approve</button></li>`);
}

window.approve = (id) => { 
    const u = getUsers(); 
    const t = u.find(x => x.uid === id); 
    if(t) { 
        t.approved = true; 
        saveUsers(u); 
        loadAdmin(); 
        if(getCurr() && getCurr().uid === t.uid) {
            // reload faculty view if current user approved themselves
            localStorage.setItem(DB.CURRENT, JSON.stringify(t));
            loadFaculty(t);
        }
    } 
};

// 🔥 SECURE RESET FUNCTION
window.secureReset = () => {
    const password = prompt("⚠ SECURITY WARNING ⚠\n\nThis will delete ALL data (Students, Faculty, Appointments).\n\nEnter Admin Password to confirm:");
    if (password === "admin123") {
        localStorage.clear();
        alert("✅ System Reset Successfully.");
        location.reload();
    } else if (password !== null) {
        alert("❌ Incorrect Password!");
    }
};

window.addEventListener('storage', checkAuth); 
checkAuth();
