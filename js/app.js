/* ══════════════════════════════════════════════
   STUDYNEST — app.js
   Router · Navigation · All page renderers
   ══════════════════════════════════════════════ */

// ── Router state ───────────────────────────────────────────────────────────
let currentPage   = 'dashboard';
let currentParams = {};          // e.g. { courseId: 'hindi' }

// ── DOM refs ───────────────────────────────────────────────────────────────
const mainContent   = document.getElementById('main-content');
const navLinks      = document.querySelectorAll('.nav-link');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar       = document.getElementById('sidebar');
const sidebarOverlay= document.getElementById('sidebar-overlay');
const pageTitleEl   = document.getElementById('page-title');
const inboxBadgeEls = document.querySelectorAll('.inbox-badge');

// ══════════════════════════════════════════════
// THEME
// ══════════════════════════════════════════════
function applyTheme() {
  const settings = SN_STORAGE.getSettings();
  document.documentElement.setAttribute('data-theme', settings.theme || 'light');
  document.documentElement.setAttribute('data-compact', settings.compactMode ? 'true' : 'false');
}
applyTheme();

// ══════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════
function navigate(page, params = {}) {
  currentPage   = page;
  currentParams = params;
  renderPage();
  updateNav();
  updateInboxBadge();
  // Close mobile sidebar on navigate
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('visible');
  window.scrollTo({ top: 0 });
}

function updateNav() {
  navLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.page === currentPage);
  });
}

function updateInboxBadge() {
  const count = SN_STORAGE.unreadCount();
  inboxBadgeEls.forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'inline-flex' : 'none';
  });
}

// Sidebar toggle (mobile)
sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('visible');
});
sidebarOverlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('visible');
});

// Nav link clicks
navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    navigate(link.dataset.page);
  });
});

// ══════════════════════════════════════════════
// ROUTER
// ══════════════════════════════════════════════
function renderPage() {
  const titles = {
    dashboard   : 'Dashboard',
    courses     : 'Courses',
    course      : 'Course Detail',
    assignments : 'Assignments',
    assignment  : 'Assignment Detail',
    grades      : 'Grades',
    calendar    : 'Calendar',
    inbox       : 'Inbox',
    settings    : 'Settings',
  };
  pageTitleEl.textContent = titles[currentPage] || 'StudyNest';

  switch (currentPage) {
    case 'dashboard':   renderDashboard();               break;
    case 'courses':     renderCourses();                 break;
    case 'course':      renderCourseDetail();            break;
    case 'assignments': renderAssignments();             break;
    case 'assignment':  renderAssignmentDetail();        break;
    case 'grades':      renderGrades();                  break;
    case 'calendar':    renderCalendar();                break;
    case 'inbox':       renderInbox();                   break;
    case 'settings':    renderSettings();                break;
    default:            mainContent.innerHTML = '<p>Page not found.</p>';
  }
}

// ══════════════════════════════════════════════
// HELPERS — shared UI fragments
// ══════════════════════════════════════════════
function progressBar(pct, colorVar = '--color-primary') {
  return `<div class="progress-bar-track">
    <div class="progress-bar-fill" style="width:${pct}%;background:var(${colorVar})"></div>
  </div>`;
}

function statusBadge(status) {
  const map = {
    'not-started' : ['badge-neutral',  'Not Started'],
    'in-progress' : ['badge-info',     'In Progress'],
    'submitted'   : ['badge-warning',  'Submitted'],
    'graded'      : ['badge-success',  'Graded'],
    'late'        : ['badge-danger',   'Late'],
  };
  const [cls, label] = map[status] || ['badge-neutral', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function gradeBadge(pct) {
  if (pct === null) return '<span class="badge badge-neutral">—</span>';
  const cls = pct >= 90 ? 'badge-success' : pct >= 70 ? 'badge-info' : 'badge-danger';
  return `<span class="badge ${cls}">${pct}%</span>`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDate(str) {
  if (!str) return '';
  const [y,m,d] = str.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}

function isOverdue(due) { return due && due < todayStr(); }
function isDueToday(due) { return due === todayStr(); }

function courseColor(courseId) {
  const c = SN_DATA.courses.find(x => x.id === courseId);
  return c ? c.color : '#6366f1';
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════
// PAGE — DASHBOARD
// ══════════════════════════════════════════════
function renderDashboard() {
  const settings    = SN_STORAGE.getSettings();
  const assignments = SN_STORAGE.getAssignments();
  const overall     = SN_STORAGE.overallGrade();
  const today       = todayStr();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Upcoming (not submitted/graded, not overdue, sorted by due)
  const upcoming = assignments
    .filter(a => !['submitted','graded'].includes(a.status) && a.due >= today)
    .sort((a,b) => a.due.localeCompare(b.due))
    .slice(0, 5);

  // Recently submitted
  const submitted = assignments
    .filter(a => ['submitted','graded'].includes(a.status))
    .slice(0, 4);

  const courseCards = SN_DATA.courses.map(course => {
    const prog  = SN_STORAGE.courseProgress(course.id);
    const grade = SN_STORAGE.courseGrade(course.id);
    const courseAssignments = assignments.filter(a => a.courseId === course.id);
    const doneCount = courseAssignments.filter(a => ['submitted','graded'].includes(a.status)).length;
    return `
      <div class="course-quick-card" style="border-left:4px solid ${course.color}" data-course="${course.id}">
        <div class="cqc-header">
          <span class="cqc-icon">${course.icon}</span>
          <div>
            <div class="cqc-name">${course.name}</div>
            <div class="cqc-code">${course.code}</div>
          </div>
          <span class="cqc-grade" style="color:${course.color}">${grade.letter}</span>
        </div>
        ${progressBar(prog.pct)}
        <div class="cqc-meta">${prog.pct}% complete · ${doneCount}/${courseAssignments.length} assignments</div>
      </div>`;
  }).join('');

  const upcomingRows = upcoming.length
    ? upcoming.map(a => {
        const course = SN_DATA.courses.find(c => c.id === a.courseId);
        const dueCls = isDueToday(a.due) ? 'due-today' : '';
        return `<div class="upcoming-row ${dueCls}" data-assignment="${a.id}">
          <div class="upcoming-dot" style="background:${course.color}"></div>
          <div class="upcoming-info">
            <div class="upcoming-title">${escHtml(a.title)}</div>
            <div class="upcoming-meta">${course.name} · ${a.points} pts</div>
          </div>
          <div class="upcoming-due">${isDueToday(a.due) ? '🔔 Today' : formatDate(a.due)}</div>
          ${statusBadge(a.status)}
        </div>`;
      }).join('')
    : '<p class="empty-hint">No upcoming assignments 🎉</p>';

  const submittedRows = submitted.length
    ? submitted.map(a => {
        const course = SN_DATA.courses.find(c => c.id === a.courseId);
        return `<div class="upcoming-row" data-assignment="${a.id}">
          <div class="upcoming-dot" style="background:${course.color}"></div>
          <div class="upcoming-info">
            <div class="upcoming-title">${escHtml(a.title)}</div>
            <div class="upcoming-meta">${course.name}</div>
          </div>
          ${statusBadge(a.status)}
          ${a.grade !== null ? gradeBadge(Math.round((a.grade/a.points)*100)) : ''}
        </div>`;
      }).join('')
    : '<p class="empty-hint">Nothing submitted yet.</p>';

  mainContent.innerHTML = `
    <div class="dashboard">

      <!-- Welcome banner -->
      <div class="welcome-banner">
        <div>
          <h2>${greeting}, ${escHtml(settings.studentName)} 👋</h2>
          <p>${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</p>
        </div>
        <div class="overall-grade-pill" title="Overall average across graded assignments">
          <span class="ogp-label">Overall</span>
          <span class="ogp-value">${overall.pct !== null ? overall.pct+'%' : '—'}</span>
          <span class="ogp-letter">${overall.letter}</span>
        </div>
      </div>

      <!-- Quick links -->
      <div class="quick-links">
        <button class="ql-btn" data-page="courses">📚 Courses</button>
        <button class="ql-btn" data-page="assignments">📝 Assignments</button>
        <button class="ql-btn" data-page="grades">📊 Grades</button>
        <button class="ql-btn" data-page="calendar">📅 Calendar</button>
      </div>

      <!-- Course cards -->
      <section class="dash-section">
        <h3 class="section-title">My Courses</h3>
        <div class="course-quick-grid">${courseCards}</div>
      </section>

      <!-- Two-column bottom -->
      <div class="dash-bottom">
        <section class="dash-section">
          <h3 class="section-title">Upcoming Assignments</h3>
          <div class="upcoming-list">${upcomingRows}</div>
        </section>
        <section class="dash-section">
          <h3 class="section-title">Recently Submitted</h3>
          <div class="upcoming-list">${submittedRows}</div>
        </section>
      </div>

    </div>`;

  // Quick-link buttons
  mainContent.querySelectorAll('.ql-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });
  // Course card clicks
  mainContent.querySelectorAll('.course-quick-card').forEach(card => {
    card.addEventListener('click', () => navigate('course', { courseId: card.dataset.course }));
  });
  // Assignment row clicks
  mainContent.querySelectorAll('[data-assignment]').forEach(row => {
    row.addEventListener('click', () => navigate('assignment', { assignmentId: row.dataset.assignment }));
  });
}

// ══════════════════════════════════════════════
// PAGE — COURSES
// ══════════════════════════════════════════════
function renderCourses() {
  const cards = SN_DATA.courses.map(course => {
    const prog  = SN_STORAGE.courseProgress(course.id);
    const grade = SN_STORAGE.courseGrade(course.id);
    const assignments = SN_STORAGE.getAssignments().filter(a => a.courseId === course.id);
    return `
      <div class="course-card" data-course="${course.id}">
        <div class="cc-header" style="background:${course.color}">
          <span class="cc-icon">${course.icon}</span>
          <div class="cc-header-info">
            <div class="cc-name">${course.name}</div>
            <div class="cc-code">${course.code}</div>
          </div>
          <div class="cc-grade-badge">${grade.letter}</div>
        </div>
        <div class="cc-body">
          <p class="cc-instructor">👨‍🏫 ${course.instructor}</p>
          <p class="cc-desc">${course.description}</p>
          <div class="cc-progress-row">
            <span>Progress</span><span>${prog.pct}%</span>
          </div>
          ${progressBar(prog.pct)}
          <div class="cc-stats">
            <span>📦 ${course.modules.length} Modules</span>
            <span>📝 ${assignments.length} Assignments</span>
            <span>⭐ ${course.credits} Credits</span>
          </div>
          <button class="btn btn-primary btn-full" data-course="${course.id}">View Course →</button>
        </div>
      </div>`;
  }).join('');

  mainContent.innerHTML = `
    <div class="courses-page">
      <div class="courses-grid">${cards}</div>
    </div>`;

  mainContent.querySelectorAll('[data-course]').forEach(el => {
    el.addEventListener('click', () => navigate('course', { courseId: el.dataset.course }));
  });
}

// ══════════════════════════════════════════════
// PAGE — COURSE DETAIL
// ══════════════════════════════════════════════
function renderCourseDetail() {
  const { courseId } = currentParams;
  const course = SN_DATA.courses.find(c => c.id === courseId);
  if (!course) { mainContent.innerHTML = '<p>Course not found.</p>'; return; }

  const prog  = SN_STORAGE.courseProgress(courseId);
  const grade = SN_STORAGE.courseGrade(courseId);
  const tab   = currentParams.tab || 'overview';

  const tabs = ['overview','modules','assignments','grades'];
  const tabNav = tabs.map(t =>
    `<button class="tab-btn ${tab===t?'active':''}" data-tab="${t}">${t.charAt(0).toUpperCase()+t.slice(1)}</button>`
  ).join('');

  let tabContent = '';
  if (tab === 'overview') {
    tabContent = renderCourseOverviewTab(course, prog, grade);
  } else if (tab === 'modules') {
    tabContent = renderCourseModulesTab(course);
  } else if (tab === 'assignments') {
    tabContent = renderCourseAssignmentsTab(course);
  } else if (tab === 'grades') {
    tabContent = renderCourseGradesTab(course, grade);
  }

  mainContent.innerHTML = `
    <div class="course-detail">
      <button class="back-btn" id="back-courses">← Back to Courses</button>
      <div class="cd-hero" style="border-left:6px solid ${course.color}">
        <div class="cd-hero-left">
          <span class="cd-icon">${course.icon}</span>
          <div>
            <h2>${course.name}</h2>
            <p class="cd-meta">${course.code} · ${course.instructor} · ${course.credits} Credits</p>
            <p class="cd-desc">${course.description}</p>
          </div>
        </div>
        <div class="cd-hero-right">
          <div class="cd-stat">
            <span class="cd-stat-val" style="color:${course.color}">${grade.pct !== null ? grade.pct+'%' : '—'}</span>
            <span class="cd-stat-label">Grade</span>
          </div>
          <div class="cd-stat">
            <span class="cd-stat-val">${grade.letter}</span>
            <span class="cd-stat-label">Letter</span>
          </div>
          <div class="cd-stat">
            <span class="cd-stat-val">${prog.pct}%</span>
            <span class="cd-stat-label">Complete</span>
          </div>
        </div>
      </div>
      <div class="tab-nav">${tabNav}</div>
      <div class="tab-content">${tabContent}</div>
    </div>`;

  document.getElementById('back-courses').addEventListener('click', () => navigate('courses'));
  mainContent.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate('course', { courseId, tab: btn.dataset.tab }));
  });
  // Module expand/collapse
  mainContent.querySelectorAll('.module-header').forEach(header => {
    header.addEventListener('click', () => {
      header.parentElement.classList.toggle('expanded');
    });
  });
  // Lesson checkboxes
  mainContent.querySelectorAll('.lesson-check').forEach(cb => {
    cb.addEventListener('change', () => {
      SN_STORAGE.toggleLesson(cb.dataset.lesson);
      navigate('course', { courseId, tab: 'modules' });
    });
  });
  // Assignment rows
  mainContent.querySelectorAll('[data-assignment]').forEach(row => {
    row.addEventListener('click', () => navigate('assignment', { assignmentId: row.dataset.assignment }));
  });
}

function renderCourseOverviewTab(course, prog, grade) {
  const assignments = SN_STORAGE.getAssignments().filter(a => a.courseId === course.id);
  const done = assignments.filter(a => ['submitted','graded'].includes(a.status)).length;
  return `
    <div class="overview-grid">
      <div class="overview-card">
        <h4>Course Progress</h4>
        ${progressBar(prog.pct)}
        <p>${prog.completed} of ${prog.total} lessons completed (${prog.pct}%)</p>
      </div>
      <div class="overview-card">
        <h4>Current Grade</h4>
        <div class="big-grade" style="color:${course.color}">${grade.pct !== null ? grade.pct+'%' : 'No grades yet'}</div>
        <div class="big-letter">${grade.letter}</div>
        ${grade.earned != null ? `<p>${grade.earned} / ${grade.possible} points earned</p>` : ''}
      </div>
      <div class="overview-card">
        <h4>Assignments</h4>
        <p>${done} of ${assignments.length} completed</p>
        ${progressBar(assignments.length ? Math.round((done/assignments.length)*100) : 0)}
      </div>
      <div class="overview-card">
        <h4>Modules</h4>
        <p>${course.modules.length} modules · ${prog.total} total lessons</p>
        ${course.modules.map(m => {
          const mp = SN_STORAGE.moduleProgress(m.id);
          return `<div class="mini-module-row">
            <span>${m.title.split('—')[0].trim()}</span>
            <span>${mp.pct}%</span>
          </div>${progressBar(mp.pct)}`;
        }).join('')}
      </div>
    </div>`;
}

function renderCourseModulesTab(course) {
  return `<div class="modules-list">
    ${course.modules.map(mod => {
      const mp = SN_STORAGE.moduleProgress(mod.id);
      return `<div class="module-item ${mp.pct===100?'completed':''}">
        <div class="module-header">
          <div class="module-title-row">
            <span class="module-chevron">▶</span>
            <div>
              <div class="module-title">${escHtml(mod.title)}</div>
              <div class="module-meta">${mp.completed}/${mp.total} lessons · ${mp.pct}%</div>
            </div>
          </div>
          <div class="module-progress-col">
            ${progressBar(mp.pct)}
            ${mp.pct===100 ? '<span class="badge badge-success">✓ Complete</span>' : ''}
          </div>
        </div>
        <div class="module-lessons">
          ${mod.lessons.map(l => {
            const done = SN_STORAGE.isLessonCompleted(l.id);
            return `<label class="lesson-row ${done?'done':''}">
              <input type="checkbox" class="lesson-check" data-lesson="${l.id}" ${done?'checked':''} />
              <span class="lesson-title">${escHtml(l.title)}</span>
              <span class="lesson-dur">${l.duration}</span>
              ${done ? '<span class="lesson-check-icon">✓</span>' : ''}
            </label>`;
          }).join('')}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function renderCourseAssignmentsTab(course) {
  const assignments = SN_STORAGE.getAssignments().filter(a => a.courseId === course.id);
  if (!assignments.length) return '<p class="empty-hint">No assignments yet.</p>';
  return `<div class="assignment-list">
    ${assignments.map(a => `
      <div class="assignment-row" data-assignment="${a.id}">
        <div class="ar-left">
          <div class="ar-title">${escHtml(a.title)}</div>
          <div class="ar-meta">${formatDate(a.due)} · ${a.points} pts</div>
        </div>
        <div class="ar-right">
          ${statusBadge(a.status)}
          ${a.grade !== null ? gradeBadge(Math.round((a.grade/a.points)*100)) : ''}
        </div>
      </div>`).join('')}
  </div>`;
}

function renderCourseGradesTab(course, grade) {
  const assignments = SN_STORAGE.getAssignments().filter(
    a => a.courseId === course.id && a.status === 'graded'
  );
  if (!assignments.length) return '<p class="empty-hint">No graded assignments yet.</p>';
  return `
    <div class="grades-tab">
      <div class="grade-summary-card" style="border-color:${course.color}">
        <div class="gsc-grade" style="color:${course.color}">${grade.pct}%</div>
        <div class="gsc-letter">${grade.letter}</div>
        <div class="gsc-detail">${grade.earned} / ${grade.possible} points</div>
      </div>
      ${assignments.map(a => `
        <div class="grade-row">
          <div class="gr-title">${escHtml(a.title)}</div>
          <div class="gr-pts">${a.grade} / ${a.points}</div>
          ${gradeBadge(Math.round((a.grade/a.points)*100))}
        </div>`).join('')}
    </div>`;
}

// ══════════════════════════════════════════════
// PAGE — ASSIGNMENTS
// ══════════════════════════════════════════════
function renderAssignments() {
  const filter = currentParams.filter || 'all';
  const sort   = currentParams.sort   || 'due';
  const today  = todayStr();

  let list = SN_STORAGE.getAssignments();

  if (filter === 'upcoming')  list = list.filter(a => !['submitted','graded'].includes(a.status) && a.due >= today);
  if (filter === 'submitted') list = list.filter(a => a.status === 'submitted');
  if (filter === 'graded')    list = list.filter(a => a.status === 'graded');
  if (filter === 'late')      list = list.filter(a => a.status === 'late' || (!['submitted','graded'].includes(a.status) && isOverdue(a.due)));

  if (sort === 'due')      list.sort((a,b) => (a.due||'').localeCompare(b.due||''));
  if (sort === 'course')   list.sort((a,b) => a.courseId.localeCompare(b.courseId));
  if (sort === 'status')   list.sort((a,b) => a.status.localeCompare(b.status));
  if (sort === 'grade')    list.sort((a,b) => (b.grade||0) - (a.grade||0));

  const filters = ['all','upcoming','submitted','graded','late'];
  const filterNav = filters.map(f =>
    `<button class="filter-pill ${filter===f?'active':''}" data-filter="${f}">${f.charAt(0).toUpperCase()+f.slice(1)}</button>`
  ).join('');

  const rows = list.length ? list.map(a => {
    const course = SN_DATA.courses.find(c => c.id === a.courseId);
    const overdue = !['submitted','graded'].includes(a.status) && isOverdue(a.due);
    return `
      <div class="assignment-row clickable" data-assignment="${a.id}">
        <div class="ar-course-dot" style="background:${course.color}"></div>
        <div class="ar-left">
          <div class="ar-title">${escHtml(a.title)}</div>
          <div class="ar-meta">
            ${course.name} ·
            ${overdue ? '<span class="overdue-label">⚠️ Overdue</span>' : formatDate(a.due)} ·
            ${a.points} pts
          </div>
        </div>
        <div class="ar-right">
          ${statusBadge(a.status)}
          ${a.grade !== null ? gradeBadge(Math.round((a.grade/a.points)*100)) : ''}
        </div>
      </div>`;
  }).join('') : '<p class="empty-hint">No assignments match this filter.</p>';

  mainContent.innerHTML = `
    <div class="assignments-page">
      <div class="assignments-toolbar">
        <div class="filter-pills">${filterNav}</div>
        <div class="sort-row">
          <label>Sort by</label>
          <select id="sort-select">
            <option value="due"    ${sort==='due'   ?'selected':''}>Due Date</option>
            <option value="course" ${sort==='course'?'selected':''}>Course</option>
            <option value="status" ${sort==='status'?'selected':''}>Status</option>
            <option value="grade"  ${sort==='grade' ?'selected':''}>Grade</option>
          </select>
        </div>
      </div>
      <div class="assignment-list">${rows}</div>
    </div>`;

  mainContent.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => navigate('assignments', { filter: btn.dataset.filter, sort }));
  });
  document.getElementById('sort-select').addEventListener('change', e => {
    navigate('assignments', { filter, sort: e.target.value });
  });
  mainContent.querySelectorAll('[data-assignment]').forEach(row => {
    row.addEventListener('click', () => navigate('assignment', { assignmentId: row.dataset.assignment }));
  });
}

// ══════════════════════════════════════════════
// PAGE — ASSIGNMENT DETAIL
// ══════════════════════════════════════════════
function renderAssignmentDetail() {
  const a = SN_STORAGE.getAssignment(currentParams.assignmentId);
  if (!a) { mainContent.innerHTML = '<p>Assignment not found.</p>'; return; }

  const course  = SN_DATA.courses.find(c => c.id === a.courseId);
  const overdue = !['submitted','graded'].includes(a.status) && isOverdue(a.due);
  const pct     = a.grade !== null ? Math.round((a.grade / a.points) * 100) : null;

  mainContent.innerHTML = `
    <div class="assignment-detail">
      <button class="back-btn" id="back-assign">← Back to Assignments</button>

      <div class="ad-card">
        <div class="ad-header" style="border-left:6px solid ${course.color}">
          <div>
            <h2>${escHtml(a.title)}</h2>
            <p class="ad-meta">
              <span style="color:${course.color}">${course.icon} ${course.name}</span> ·
              ${a.points} points possible ·
              Due: ${formatDate(a.due)}
              ${overdue ? '<span class="overdue-label">⚠️ Overdue</span>' : ''}
            </p>
          </div>
          <div class="ad-status-col">
            ${statusBadge(a.status)}
            ${pct !== null ? gradeBadge(pct) : ''}
          </div>
        </div>

        <div class="ad-body">
          <h3>Instructions</h3>
          <p class="ad-instructions">${escHtml(a.description)}</p>

          ${a.grade !== null ? `
            <div class="grade-feedback-box">
              <h3>Grade</h3>
              <div class="gfb-row">
                <span class="gfb-score">${a.grade} / ${a.points}</span>
                ${gradeBadge(pct)}
              </div>
            </div>` : ''}

          <div class="submission-area">
            <h3>Submission</h3>
            <p class="sub-hint">This is a practice submission area. No files are uploaded.</p>
            <textarea id="sub-text" placeholder="Type your notes or work here…" rows="5">${a.submissionText || ''}</textarea>
            <div class="sub-actions">
              ${a.status !== 'graded' ? `
                <button class="btn btn-secondary" id="btn-progress">Mark In Progress</button>
                <button class="btn btn-primary"   id="btn-submit">Submit Assignment</button>
                ${a.status !== 'not-started' ? `<button class="btn btn-ghost" id="btn-reset">Reset Status</button>` : ''}
              ` : '<p class="graded-note">✅ This assignment has been graded.</p>'}
            </div>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('back-assign').addEventListener('click', () => navigate('assignments'));

  if (a.status !== 'graded') {
    const btnProgress = document.getElementById('btn-progress');
    const btnSubmit   = document.getElementById('btn-submit');
    const btnReset    = document.getElementById('btn-reset');
    const subText     = document.getElementById('sub-text');

    if (btnProgress) btnProgress.addEventListener('click', () => {
      SN_STORAGE.updateAssignment(a.id, { status: 'in-progress', submissionText: subText.value });
      navigate('assignment', { assignmentId: a.id });
    });
    btnSubmit.addEventListener('click', () => {
      SN_STORAGE.updateAssignment(a.id, { status: 'submitted', submissionText: subText.value });
      navigate('assignment', { assignmentId: a.id });
    });
    if (btnReset) btnReset.addEventListener('click', () => {
      SN_STORAGE.updateAssignment(a.id, { status: 'not-started', submissionText: '' });
      navigate('assignment', { assignmentId: a.id });
    });
  }
}

// ══════════════════════════════════════════════
// PAGE — GRADES
// ══════════════════════════════════════════════
function renderGrades() {
  const overall = SN_STORAGE.overallGrade();

  const courseBlocks = SN_DATA.courses.map(course => {
    const grade = SN_STORAGE.courseGrade(course.id);
    const assignments = SN_STORAGE.getAssignments().filter(
      a => a.courseId === course.id && a.status === 'graded'
    );
    const rows = assignments.map(a => `
      <div class="grade-row">
        <div class="gr-title">${escHtml(a.title)}</div>
        <div class="gr-pts">${a.grade} / ${a.points}</div>
        ${gradeBadge(Math.round((a.grade/a.points)*100))}
      </div>`).join('') || '<p class="empty-hint">No graded assignments yet.</p>';

    return `
      <div class="grade-course-block">
        <div class="gcb-header" style="border-left:5px solid ${course.color}">
          <div class="gcb-title">
            <span>${course.icon}</span>
            <div>
              <div class="gcb-name">${course.name}</div>
              <div class="gcb-code">${course.code} · ${course.instructor}</div>
            </div>
          </div>
          <div class="gcb-grade-col">
            <span class="gcb-pct" style="color:${course.color}">${grade.pct !== null ? grade.pct+'%' : '—'}</span>
            <span class="gcb-letter">${grade.letter}</span>
          </div>
        </div>
        ${grade.pct !== null ? progressBar(grade.pct) : ''}
        <div class="gcb-rows">${rows}</div>
      </div>`;
  }).join('');

  mainContent.innerHTML = `
    <div class="grades-page">
      <div class="overall-summary-card">
        <div class="osc-left">
          <div class="osc-label">Overall Average</div>
          <div class="osc-sub">Sample/demo calculation across graded assignments</div>
        </div>
        <div class="osc-right">
          <span class="osc-pct">${overall.pct !== null ? overall.pct+'%' : '—'}</span>
          <span class="osc-letter">${overall.letter}</span>
        </div>
      </div>
      ${courseBlocks}
    </div>`;
}

// ══════════════════════════════════════════════
// PAGE — CALENDAR
// ══════════════════════════════════════════════
function renderCalendar() {
  const view  = currentParams.view  || 'upcoming';
  const today = todayStr();
  const [ty, tm] = today.split('-').map(Number);
  const year  = currentParams.year  || ty;
  const month = currentParams.month || tm;

  const views = ['upcoming','month','week'];
  const viewNav = views.map(v =>
    `<button class="filter-pill ${view===v?'active':''}" data-view="${v}">${v.charAt(0).toUpperCase()+v.slice(1)}</button>`
  ).join('');

  let calContent = '';
  if (view === 'upcoming') calContent = renderCalendarUpcoming(today);
  if (view === 'month')    calContent = renderCalendarMonth(year, month, today);
  if (view === 'week')     calContent = renderCalendarWeek(today);

  mainContent.innerHTML = `
    <div class="calendar-page">
      <div class="filter-pills">${viewNav}</div>
      ${calContent}
    </div>`;

  mainContent.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => navigate('calendar', { view: btn.dataset.view, year, month }));
  });
  mainContent.querySelectorAll('.cal-prev').forEach(btn =>
    btn.addEventListener('click', () => {
      let nm = month - 1, ny = year;
      if (nm < 1) { nm = 12; ny--; }
      navigate('calendar', { view: 'month', year: ny, month: nm });
    })
  );
  mainContent.querySelectorAll('.cal-next').forEach(btn =>
    btn.addEventListener('click', () => {
      let nm = month + 1, ny = year;
      if (nm > 12) { nm = 1; ny++; }
      navigate('calendar', { view: 'month', year: ny, month: nm });
    })
  );
}

function renderCalendarUpcoming(today) {
  const events = SN_DATA.events
    .filter(e => e.date >= today)
    .sort((a,b) => a.date.localeCompare(b.date));
  if (!events.length) return '<p class="empty-hint">No upcoming events.</p>';
  return `<div class="event-list">
    ${events.map(e => {
      const course = e.courseId ? SN_DATA.courses.find(c => c.id === e.courseId) : null;
      const color  = course ? course.color : '#6366f1';
      return `<div class="event-row">
        <div class="event-date-col">
          <div class="event-day">${new Date(...e.date.split('-').map((v,i)=>i===1?v-1:+v)).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
        </div>
        <div class="event-dot" style="background:${color}"></div>
        <div class="event-info">
          <div class="event-title">${escHtml(e.title)}</div>
          <div class="event-type-badge ${e.type==='assignment'?'badge-warning':'badge-info'} badge">${e.type}</div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function renderCalendarMonth(year, month, today) {
  const monthName = new Date(year, month-1, 1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const firstDay  = new Date(year, month-1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const eventMap = {};
  SN_DATA.events.forEach(e => { (eventMap[e.date] = eventMap[e.date]||[]).push(e); });

  const dayHeaders = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(
    d => `<div class="cal-day-header">${d}</div>`
  ).join('');

  let cells = '';
  for (let i = 0; i < firstDay; i++) cells += '<div class="cal-cell empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === today;
    const dayEvents = eventMap[dateStr] || [];
    const dots = dayEvents.slice(0,3).map(e => {
      const c = e.courseId ? SN_DATA.courses.find(x=>x.id===e.courseId) : null;
      return `<span class="cal-dot" style="background:${c?c.color:'#6366f1'}" title="${escHtml(e.title)}"></span>`;
    }).join('');
    cells += `<div class="cal-cell ${isToday?'today':''}">
      <div class="cal-cell-num">${d}</div>
      <div class="cal-dots">${dots}</div>
    </div>`;
  }

  return `
    <div class="cal-month-nav">
      <button class="btn btn-ghost cal-prev">‹ Prev</button>
      <h3>${monthName}</h3>
      <button class="btn btn-ghost cal-next">Next ›</button>
    </div>
    <div class="cal-grid">
      ${dayHeaders}${cells}
    </div>`;
}

function renderCalendarWeek(today) {
  const d = new Date(today);
  const dow = d.getDay();
  const weekStart = new Date(d); weekStart.setDate(d.getDate() - dow);
  const days = Array.from({length:7}, (_,i) => {
    const dd = new Date(weekStart); dd.setDate(weekStart.getDate()+i);
    return `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`;
  });

  return `<div class="week-grid">
    ${days.map(dateStr => {
      const dayEvents = SN_DATA.events.filter(e => e.date === dateStr);
      const isToday   = dateStr === today;
      const label     = new Date(...dateStr.split('-').map((v,i)=>i===1?v-1:+v))
                          .toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
      return `<div class="week-col ${isToday?'today':''}">
        <div class="week-day-label">${label}</div>
        ${dayEvents.length
          ? dayEvents.map(e => {
              const c = e.courseId ? SN_DATA.courses.find(x=>x.id===e.courseId):null;
              return `<div class="week-event" style="border-left:3px solid ${c?c.color:'#6366f1'}">${escHtml(e.title)}</div>`;
            }).join('')
          : '<div class="week-empty">—</div>'}
      </div>`;
    }).join('')}
  </div>`;
}

// ══════════════════════════════════════════════
// PAGE — INBOX
// ══════════════════════════════════════════════
function renderInbox() {
  const messages  = SN_STORAGE.getMessages();
  const activeId  = currentParams.messageId || null;
  const active    = activeId ? messages.find(m => m.id === activeId) : null;

  const msgList = messages.map(m => `
    <div class="msg-row ${m.read?'read':'unread'} ${activeId===m.id?'active':''}" data-msg="${m.id}">
      <div class="msg-avatar">${m.from.charAt(0)}</div>
      <div class="msg-preview">
        <div class="msg-from">${escHtml(m.from)} ${!m.read ? '<span class="unread-dot"></span>' : ''}</div>
        <div class="msg-subject">${escHtml(m.subject)}</div>
        <div class="msg-date">${formatDate(m.date)}</div>
      </div>
    </div>`).join('');

  const msgBody = active ? `
    <div class="msg-detail">
      <div class="msg-detail-header">
        <h3>${escHtml(active.subject)}</h3>
        <p class="msg-detail-meta">From: ${escHtml(active.from)} · ${escHtml(active.course)} · ${formatDate(active.date)}</p>
      </div>
      <div class="msg-detail-body">${escHtml(active.body)}</div>
    </div>` : `<div class="msg-placeholder">← Select a message to read</div>`;

  mainContent.innerHTML = `
    <div class="inbox-layout">
      <div class="inbox-list">${msgList}</div>
      <div class="inbox-body">${msgBody}</div>
    </div>`;

  mainContent.querySelectorAll('.msg-row').forEach(row => {
    row.addEventListener('click', () => {
      SN_STORAGE.markMessageRead(row.dataset.msg);
      updateInboxBadge();
      navigate('inbox', { messageId: row.dataset.msg });
    });
  });
}

// ══════════════════════════════════════════════
// PAGE — SETTINGS
// ══════════════════════════════════════════════
function renderSettings() {
  const s = SN_STORAGE.getSettings();
  mainContent.innerHTML = `
    <div class="settings-page">
      <div class="settings-card">
        <h3>👤 Profile</h3>
        <div class="setting-row">
          <label for="set-name">Student Name</label>
          <input type="text" id="set-name" value="${escHtml(s.studentName)}" />
        </div>
        <div class="setting-row">
          <label for="set-email">Email</label>
          <input type="text" id="set-email" value="${escHtml(s.email)}" />
        </div>
      </div>

      <div class="settings-card">
        <h3>🎨 Appearance</h3>
        <div class="setting-row">
          <label>Theme</label>
          <div class="toggle-group">
            <button class="toggle-btn ${s.theme==='light'?'active':''}" data-theme="light">☀️ Light</button>
            <button class="toggle-btn ${s.theme==='dark'?'active':''}"  data-theme="dark">🌙 Dark</button>
          </div>
        </div>
        <div class="setting-row">
          <label>Compact Mode</label>
          <label class="switch">
            <input type="checkbox" id="set-compact" ${s.compactMode?'checked':''} />
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <div class="settings-card">
        <h3>🔔 Notifications</h3>
        <div class="setting-row">
          <label>Assignment Reminders</label>
          <label class="switch"><input type="checkbox" id="set-notif-assign" ${s.notifyAssignments?'checked':''}><span class="slider"></span></label>
        </div>
        <div class="setting-row">
          <label>New Messages</label>
          <label class="switch"><input type="checkbox" id="set-notif-msg" ${s.notifyMessages?'checked':''}><span class="slider"></span></label>
        </div>
        <div class="setting-row">
          <label>Grade Posted</label>
          <label class="switch"><input type="checkbox" id="set-notif-grade" ${s.notifyGrades?'checked':''}><span class="slider"></span></label>
        </div>
      </div>

      <div class="settings-card">
        <h3>🛠 Data</h3>
        <p class="setting-hint">Reset all app data back to the original sample content.</p>
        <button class="btn btn-danger" id="btn-reset-all">Reset All Data</button>
      </div>

      <div class="settings-actions">
        <button class="btn btn-primary btn-lg" id="btn-save-settings">💾 Save Settings</button>
        <span class="save-confirm hidden" id="save-confirm">✓ Saved!</span>
      </div>
    </div>`;

  // Theme toggle
  mainContent.querySelectorAll('[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      mainContent.querySelectorAll('[data-theme]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Save
  document.getElementById('btn-save-settings').addEventListener('click', () => {
    const theme = mainContent.querySelector('[data-theme].active').dataset.theme;
    SN_STORAGE.saveSettings({
      studentName       : document.getElementById('set-name').value.trim() || 'Alex',
      email             : document.getElementById('set-email').value.trim(),
      theme,
      compactMode       : document.getElementById('set-compact').checked,
      notifyAssignments : document.getElementById('set-notif-assign').checked,
      notifyMessages    : document.getElementById('set-notif-msg').checked,
      notifyGrades      : document.getElementById('set-notif-grade').checked,
    });
    applyTheme();
    document.getElementById('save-confirm').classList.remove('hidden');
    setTimeout(() => document.getElementById('save-confirm').classList.add('hidden'), 2500);
  });

  // Reset
  document.getElementById('btn-reset-all').addEventListener('click', () => {
    if (confirm('Reset all data to defaults? This cannot be undone.')) {
      SN_STORAGE.resetAll();
      navigate('dashboard');
    }
  });
}

// ══════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════
navigate('dashboard');
