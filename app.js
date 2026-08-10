(() => {
  const config = {
    url: 'https://tpdwjpgodrliilciwefr.supabase.co',
    publishableKey: 'sb_publishable_RLrgjTidqI_KcRDfmxKYzw_Rr9nUhuD',
    redirectTo: window.location.hostname === 'ideamealkit-svg.github.io'
      ? 'https://ideamealkit-svg.github.io/insta/'
      : 'http://127.0.0.1:4173/'
  };
  const configured = /^https:\/\/[\w-]+\.supabase\.co\/?$/.test(config.url)
    && config.publishableKey.startsWith('sb_publishable_');
  let client = null;
  let user = null;
  let status = configured ? 'initializing' : 'needs-configuration';

  const emit = () => window.dispatchEvent(new CustomEvent('mori:auth-state', {
    detail: { user, configured, status }
  }));

  const loadSdk = () => new Promise((resolve, reject) => {
    if (window.supabase?.createClient) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'vendor/supabase.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Supabase SDK를 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });

  const initialize = async () => {
    if (!configured) {
      emit();
      return;
    }
    try {
      await loadSdk();
      client = window.supabase.createClient(config.url, config.publishableKey, {
        auth: {
          flowType: 'implicit',
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true
        }
      });
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      user = data.session?.user || null;
      status = 'ready';
      client.auth.onAuthStateChange((_event, session) => {
        user = session?.user || null;
        status = 'ready';
        emit();
      });
    } catch (error) {
      console.error('Mori auth initialization failed', error);
      status = 'error';
    }
    emit();
  };

  window.MoriAuth = {
    getState: () => ({ user, configured, status }),
    signInWithGoogle: async () => {
      if (!configured) throw new Error('Supabase 공개 설정이 없습니다.');
      if (!client) await initialize();
      if (!client) throw new Error('Supabase에 연결하지 못했습니다.');
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: config.redirectTo,
          scopes: 'openid email profile'
        }
      });
      if (error) throw error;
    },
    signOut: async () => {
      if (!client) return;
      const { error } = await client.auth.signOut();
      if (error) throw error;
    }
  };

  initialize();
})();

const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const mediaSources = window.MORI_ASSETS || ['assets/feed-haerin.png', 'assets/feed-woojin.png', 'assets/feed-yoonseul.png', 'assets/feed-flower.png', 'assets/feed-rooftop.png', 'assets/feed-gallery.png'];
const utility = document.querySelector('#utility-dialog');
const utilityContent = document.querySelector('#utility-content');
const composer = document.querySelector('#composer');
const feedViewer = document.querySelector('#feed-viewer');
const viewerTrack = document.querySelector('#viewer-track');
const commentSheet = document.querySelector('#comment-sheet');
const sheetComments = document.querySelector('#sheet-comments');
const storageKey = 'mori-demo-state-v3';

document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));

const initialPosts = [
  {id:'haerin',handle:'haerin.room',name:'해린',place:'성수동, 서울',avatar:'avatar-sand',image:mediaSources[0],likes:248,time:'32분 전',text:'늦여름의 빛이 가장 예쁘게 머무는 시간. 오늘의 작은 장면을 남겨요.',tag:'Summer collection',tagDetail:'Linen table set',category:'패션',comments:[{user:'dawn.archive',text:'빛이 정말 아름다워요.'},{user:'jiyun.kim',text:'창가 자리의 분위기가 좋아요.'}]},
  {id:'woojin',handle:'studio.woon',name:'우진',place:'연희동, 서울',avatar:'avatar-ink',image:mediaSources[1],likes:97,time:'2시간 전',text:'창가 가까이에 앉아 천천히 생각을 정리하는 오후.',tag:'Sunday studio',tagDetail:'Workspace note',category:'공간',comments:[{user:'hanul.log',text:'정돈된 공간이 멋집니다.'}]},
  {id:'yoonseul',handle:'yoonseul',name:'윤슬',place:'부산, 광안리',avatar:'avatar-orange',image:mediaSources[2],likes:312,time:'5시간 전',text:'파도 소리를 따라 걷다 보면, 마음도 한결 가벼워져요.',tag:'Weekend spot',tagDetail:'Gwangalli, Busan',category:'여행',comments:[{user:'seoyeon',text:'다음에는 꼭 같이 가요!'},{user:'jiyun.kim',text:'이 계절의 바다를 좋아해요.'}]},
  {id:'seoyeon',handle:'seoyeon.flowers',name:'서연',place:'망원동, 서울',avatar:'avatar-rose',image:mediaSources[3],likes:426,time:'어제',text:'계절의 색을 고르는 일은 언제나 즐거워요. 오늘은 코랄과 레몬 옐로.',tag:'Flower note',tagDetail:'Mango blossom',category:'패션',comments:[{user:'yoonseul',text:'꽃 색감이 정말 예뻐요.'}]},
  {id:'dawn',handle:'dawn.archive',name:'다은',place:'을지로, 서울',avatar:'avatar-user',image:mediaSources[4],likes:183,time:'어제',text:'해가 지기 전, 도시가 가장 선명한 파란색이 되는 순간.',tag:'City sunset',tagDetail:'Rooftop journal',category:'여행',comments:[{user:'haerin.room',text:'색감이 영화 같아요.'}]},
  {id:'miso',handle:'miso.sees',name:'미소',place:'삼청동, 서울',avatar:'avatar-sand',image:mediaSources[5],likes:355,time:'2일 전',text:'좋아하는 색 앞에서는 조금 더 오래 머물게 됩니다.',tag:'Gallery day',tagDetail:'Color study',category:'공간',comments:[{user:'studio.woon',text:'전시 보러 가고 싶어지네요.'}]}
];
const state = {posts:initialPosts.map(post => ({...post,comments:[...post.comments]})),saved:new Set(),following:new Set(),liked:new Set(),profileTab:'posts',exploreTopic:'전체',sort:'for-you',draftImage:'',draftLocation:'',allowComments:true,privateAccount:false,user:{name:'김지윤',bio:'작고 아름다운 일상을 기록합니다. ☕'},viewerPostId:null,commentPostId:null};
const stories = [{label:'내 스토리',self:true,image:mediaSources[0]},{label:'해린',image:mediaSources[0]},{label:'우진',image:mediaSources[1]},{label:'윤슬',image:mediaSources[2]},{label:'서연',image:mediaSources[3]},{label:'다은',image:mediaSources[4]},{label:'미소',image:mediaSources[5]}];
const creators = [{id:'hanul.log',name:'hanul.log',detail:'새로운 회원',avatar:'avatar-rose',letter:'H'},{id:'dawn.archive',name:'dawn.archive',detail:'min.jun님이 팔로우함',avatar:'avatar-ink',letter:'D'},{id:'atelier_su',name:'atelier_su',detail:'회원님을 위한 추천',avatar:'avatar-orange',letter:'A'}];

function persist(){localStorage.setItem(storageKey,JSON.stringify({saved:[...state.saved],following:[...state.following],liked:[...state.liked],profileTab:state.profileTab,sort:state.sort,privateAccount:state.privateAccount,user:state.user}));}
function restore(){try{const saved=JSON.parse(localStorage.getItem(storageKey));if(!saved)return;state.saved=new Set(saved.saved||[]);state.following=new Set(saved.following||[]);state.liked=new Set(saved.liked||[]);state.profileTab=saved.profileTab||'posts';state.sort=saved.sort||'latest';state.privateAccount=Boolean(saved.privateAccount);state.user=saved.user||state.user}catch{}}
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.classList.remove('show'),2200)}
function openUtility(title,body,wide=false){utilityContent.innerHTML=`<section class="utility-card ${wide?'wide':''}"><header><h2>${title}</h2><button class="icon-only utility-close" aria-label="닫기">${icon('close')}</button></header><div class="utility-body">${body}</div></section>`;if(!utility.open)utility.showModal()}
function closeUtility(){utility.close()}
function postById(id){return state.posts.find(post=>post.id===id)}
function formatCount(value){return value.toLocaleString('ko-KR')}
function authState(){return window.MoriAuth?.getState?.()||{user:null,configured:false,status:'needs-configuration'}}
function authName(user){return user?.user_metadata?.full_name||user?.user_metadata?.name||state.user.name}
function authHandle(user){return user?.user_metadata?.preferred_username||user?.email?.split('@')[0]||'jiyun.kim'}
function showAuth(){const auth=authState();if(auth.user){openUtility('Google 계정',`<div class="auth-account"><span class="avatar avatar-user">${authName(auth.user).slice(0,1)}</span><div><b>${authName(auth.user)}</b><small>${auth.user.email||''}</small></div></div><button class="utility-row danger" data-action="sign-out">로그아웃</button>`);return}if(!auth.configured){openUtility('Google 로그인 연결',`<div class="auth-setup"><p><b>Supabase 프로젝트 연결이 먼저 필요합니다.</b><br>프로젝트 URL과 publishable key를 <code>supabase-config.js</code>에 넣은 뒤 다시 열어주세요.</p><ol><li>Google Cloud Console에서 웹 OAuth 클라이언트를 만듭니다.</li><li>승인된 리디렉션 URI에 Supabase의 Google Provider 콜백 URL을 추가합니다.</li><li>Google Client ID/Secret은 Supabase Dashboard의 Google Provider에만 입력합니다.</li></ol><small>현재 개발 URL: <code>http://127.0.0.1:4173/</code></small></div>`);return}openUtility('Google로 로그인',`<div class="auth-setup"><p>Google 계정으로 mori를 시작합니다. 이름과 이메일은 프로필에만 사용됩니다.</p><button class="google-button" data-action="sign-in-google"><span aria-hidden="true">G</span> Google로 계속하기</button></div>`)}
function refreshAuthIdentity(){const {user}=authState();if(!user){applyProfile();return}applyProfile();toast(`${authName(user)}님, 환영합니다.`)}

function renderStories(){document.querySelector('#story-strip').innerHTML=stories.map((story,index)=>`<button class="story" data-action="story" data-story="${index}">${story.self?`<span class="story-avatar new">${icon('plus')}</span>`:`<span class="story-avatar"><img class="story-image" src="${story.image}" alt="${story.label} 스토리"></span>`}<span>${story.label}</span></button>`).join('')}
function feedScore(post,index){const hours=Math.max(index*10+2,2);const recency=Math.exp(-hours/42);const relationship={haerin:.88,woojin:.72,yoonseul:.64,seoyeon:.58,dawn:.42,miso:.36}[post.id]||.3;const interest={패션:.84,공간:.77,여행:.68}[post.category]||.5;const quality=Math.min(post.likes/450,.96);const interaction=(state.liked.has(post.id)?.08:0)+(state.saved.has(post.id)?.12:0)+(post.comments.some(comment=>comment.user==='jiyun.kim')?.06:0);return relationship*.3+interest*.24+recency*.18+quality*.14+.08+interaction}
function orderedPosts(){if(state.sort==='latest')return [...state.posts];if(state.sort==='popular')return [...state.posts].sort((a,b)=>b.likes-a.likes);const ranked=state.posts.map((post,index)=>({post,score:feedScore(post,index)})).sort((a,b)=>b.score-a.score);const authors=new Set();const diverse=[];const deferred=[];ranked.forEach(item=>{if(authors.has(item.post.handle))deferred.push(item);else{authors.add(item.post.handle);diverse.push(item)}});return diverse.concat(deferred).map(item=>item.post)}
function updateRankLabel(){const label={"for-you":"추천순","latest":"최신순","popular":"인기순"}[state.sort]||"추천순";document.querySelectorAll('.filter-button').forEach(button=>button.innerHTML=`${label} ${icon('chevron')}`)}
function renderPosts(){const list=document.querySelector('#post-list');const posts=orderedPosts();updateRankLabel();list.innerHTML=posts.map(post=>{const liked=state.liked.has(post.id),saved=state.saved.has(post.id);return `<article class="post" data-post="${post.id}"><header class="post-header"><span class="avatar ${post.avatar}">${post.name[0]}</span><div class="post-owner"><b>${post.handle}</b><span>${post.place}</span></div><button class="more" data-action="post-menu" data-post="${post.id}" aria-label="게시물 더보기">${icon('more')}</button></header><div class="media-wrap"><button class="media-open" data-action="open-viewer" data-post="${post.id}" aria-label="${post.handle} 전체 화면으로 보기"><img src="${post.image}" alt="${post.place}의 게시물 사진"></button><button class="tag-chip" data-action="tag" data-post="${post.id}" aria-label="상품 태그"><span class="tag-dot"></span><span><b>${post.tag}</b><small>${post.tagDetail}</small></span></button></div><div class="post-actions"><button class="action-button ${liked?'liked':''}" data-action="like" data-post="${post.id}" aria-label="좋아요">${icon('heart')}</button><button class="action-button" data-action="comments" data-post="${post.id}" aria-label="댓글">${icon('comment')}</button><button class="action-button" data-action="share" data-post="${post.id}" aria-label="공유">${icon('send')}</button><button class="action-button saved ${saved?'liked':''}" data-action="save" data-post="${post.id}" aria-label="저장">${icon('bookmark')}</button></div><div class="post-copy"><p class="likes">좋아요 <span>${formatCount(post.likes)}</span>개</p><p class="caption"><b>${post.handle}</b>${post.text}</p><button class="comments" data-action="comments" data-post="${post.id}">댓글 ${post.comments.length}개 모두 보기</button><small class="post-time">${post.time}</small></div></article>`}).join('');list.querySelectorAll('.media-open').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();openViewer(button.dataset.post)}))}
function renderSuggested(){document.querySelector('#suggestions').innerHTML=creators.map(creator=>{const following=state.following.has(creator.id);return `<div class="suggestion"><span class="avatar ${creator.avatar}">${creator.letter}</span><div><b>${creator.name}</b><small>${creator.detail}</small></div><button class="suggest-follow" data-action="follow" data-user="${creator.id}">${following?'팔로잉':'팔로우'}</button></div>`}).join('')}
function renderExplore(){const categories=['전체','패션','공간','여행'];document.querySelector('.topic-chips').innerHTML=categories.map(category=>`<button class="${state.exploreTopic===category?'selected':''}" data-action="topic" data-topic="${category}">${category}</button>`).join('');const posts=state.exploreTopic==='전체'?state.posts:state.posts.filter(post=>post.category===state.exploreTopic);document.querySelector('#explore-grid').innerHTML=posts.concat(posts,posts).map((post,index)=>`<button class="explore-tile" data-action="explore-post" data-post="${post.id}" aria-label="${post.handle} 게시물"><img src="${post.image}" alt="${post.handle} 게시물"><span>♡ ${formatCount(post.likes+index*7)}</span></button>`).join('')}
function renderProfile(){const saved=state.profileTab==='saved';const posts=saved?state.posts.filter(post=>state.saved.has(post.id)):state.posts;document.querySelector('.profile-tabs').innerHTML=`<button class="${!saved?'selected':''}" data-action="profile-tab" data-tab="posts">${icon('grid')}게시물</button><button class="${saved?'selected':''}" data-action="profile-tab" data-tab="saved">${icon('bookmark')}저장됨</button>`;document.querySelector('#profile-grid').innerHTML=posts.length?posts.concat(posts).slice(0,9).map(post=>`<button class="profile-tile" data-action="explore-post" data-post="${post.id}"><img src="${post.image}" alt="${post.handle} 게시물"></button>`).join(''):`<div class="empty-state"><span>${icon('bookmark')}</span><b>저장한 게시물이 없습니다</b><small>마음에 드는 콘텐츠를 저장해 보세요.</small></div>`}
function applyProfile(){const {user}=authState();const name=user?authName(user):state.user.name;const handle=user?authHandle(user):'jiyun.kim';const mini=document.querySelector('.mini-profile small');const miniHandle=document.querySelector('.mini-profile b');const bio=document.querySelector('.profile-info p');const profileHandle=document.querySelector('.profile-info h1');if(mini)mini.textContent=name;if(miniHandle)miniHandle.textContent=handle;if(profileHandle)profileHandle.textContent=handle;if(bio)bio.innerHTML=`<b>${name}</b><br>${state.user.bio}`;document.querySelectorAll('.avatar-user').forEach(avatar=>{if(avatar.matches('img'))return;avatar.textContent=name.slice(0,1).toUpperCase()})}
function renderAll(){renderStories();renderPosts();renderSuggested();renderExplore();renderProfile();applyProfile()}

function showScreen(id){document.querySelectorAll('.screen').forEach(el=>el.classList.toggle('active-screen',el.id===id));document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===id));window.scrollTo({top:0,behavior:'smooth'})}
function renderViewer(activeId){const posts=orderedPosts();viewerTrack.innerHTML=posts.map(post=>{const liked=state.liked.has(post.id),saved=state.saved.has(post.id);return `<article class="viewer-slide" data-viewer-post="${post.id}"><img src="${post.image}" alt="${post.place}의 게시물 사진"><div class="viewer-shade"></div><header class="viewer-top"><button data-action="close-viewer" aria-label="닫기">${icon('close')}</button><span>${post.handle}</span><button data-action="post-menu" data-post="${post.id}" aria-label="게시물 더보기">${icon('more')}</button></header><div class="viewer-actions"><button class="${liked?'liked':''}" data-action="like" data-post="${post.id}">${icon('heart')}<small>${formatCount(post.likes)}</small></button><button data-action="comments" data-post="${post.id}">${icon('comment')}<small>${post.comments.length}</small></button><button data-action="share" data-post="${post.id}">${icon('send')}<small>공유</small></button><button class="${saved?'liked':''}" data-action="save" data-post="${post.id}">${icon('bookmark')}<small>저장</small></button></div><div class="viewer-copy"><p><b>${post.handle}</b>${post.text}</p><span>${post.place} · ${post.time}</span></div><div class="viewer-progress"><i></i><i></i><i></i><i></i><i></i><i></i></div></article>`}).join('');state.viewerPostId=activeId}
function openViewer(id){renderViewer(id);if(!feedViewer.open)feedViewer.showModal();requestAnimationFrame(()=>viewerTrack.querySelector(`[data-viewer-post="${id}"]`)?.scrollIntoView({block:'start'}))}
function closeViewer(){feedViewer.close();state.viewerPostId=null}
function renderSheetComments(){const post=postById(state.commentPostId);sheetComments.innerHTML=post.comments.map(comment=>`<p><span class="avatar tiny avatar-user">${comment.user[0].toUpperCase()}</span><span><b>${comment.user}</b>${comment.text}</span></p>`).join('')||'<p class="sheet-empty">첫 댓글을 남겨 보세요.</p>'}
function showComments(id){state.commentPostId=id;renderSheetComments();if(!commentSheet.open)commentSheet.showModal()}
function closeSheet(){commentSheet.close();state.commentPostId=null}
function showPostMenu(id){openUtility('게시물 옵션',`<button class="utility-row" data-action="copy-link" data-post="${id}">링크 복사</button><button class="utility-row" data-action="tag" data-post="${id}">상품 정보 보기</button><button class="utility-row danger" data-action="report" data-post="${id}">게시물 신고</button>`)}
function showStory(index){const story=stories[index];openUtility(story.label,`<div class="story-view"><img src="${story.image}" alt="${story.label} 스토리"><p>${story.self?'오늘의 이야기를 남겨 보세요.':'새로운 이야기를 확인했어요.'}</p></div>`)}
function showTag(id){const post=postById(id);openUtility(post.tag,`<div class="product-detail"><img src="${post.image}" alt="${post.tag}"><div><small>PRODUCT TAG</small><h3>${post.tagDetail}</h3><p>${post.place}에서 발견한 오늘의 추천 아이템입니다.</p><button class="primary-button" data-action="save" data-post="${id}">저장하기</button></div></div>`)}
function showSettings(){const auth=authState();const account=auth.user?`<button class="utility-row" data-action="show-auth">Google 계정 <b>${auth.user.email||'로그인됨'}</b></button>`:`<button class="utility-row" data-action="show-auth">Google로 로그인 <b>${auth.configured?'연결됨':'설정 필요'}</b></button>`;openUtility('설정',`${account}<button class="utility-row" data-action="toggle-private">계정 비공개 <b>${state.privateAccount?'켜짐':'꺼짐'}</b></button><button class="utility-row" data-action="interest-settings">관심사 설정</button><button class="utility-row" data-action="reset-demo">데모 데이터 초기화</button>`)}
function showEditProfile(){openUtility('프로필 수정',`<form id="profile-form" class="stack-form"><label>이름<input name="name" value="${state.user.name}" required></label><label>소개<textarea name="bio" maxlength="120">${state.user.bio}</textarea></label><button class="primary-button" type="submit">저장</button></form>`)}
function showCreatorList(){openUtility('추천 크리에이터',creators.map(creator=>`<div class="suggestion"><span class="avatar ${creator.avatar}">${creator.letter}</span><div><b>${creator.name}</b><small>${creator.detail}</small></div><button class="suggest-follow" data-action="follow" data-user="${creator.id}">${state.following.has(creator.id)?'팔로잉':'팔로우'}</button></div>`).join(''))}
function showAccountSwitcher(){const {user}=authState();openUtility('계정 전환',`<div class="choice-list"><button data-action="show-auth">${user?`${authHandle(user)} · ${authName(user)}`:'Google 계정으로 로그인'}</button><button data-action="account-selected">새 계정 추가</button></div>`)}
function showFilter(){openUtility('피드 정렬',`<button class="utility-row" data-action="sort" data-sort="for-you">추천순 ${state.sort==='for-you'?'✓':''}</button><button class="utility-row" data-action="sort" data-sort="latest">최신순 ${state.sort==='latest'?'✓':''}</button><button class="utility-row" data-action="sort" data-sort="popular">인기순 ${state.sort==='popular'?'✓':''}</button>`)}
function showComposerOption(kind){if(kind==='location'){openUtility('위치 추가',`<div class="choice-list"><button data-action="set-location" data-location="성수동, 서울">성수동, 서울</button><button data-action="set-location" data-location="연희동, 서울">연희동, 서울</button><button data-action="set-location" data-location="광안리, 부산">광안리, 부산</button></div>`)}else{openUtility('고급 설정',`<button class="utility-row" data-action="toggle-comments">댓글 허용 <b>${state.allowComments?'켜짐':'꺼짐'}</b></button>`)} }
async function sharePost(id){const post=postById(id);const text=`mori · ${post.handle}의 게시물`;try{await navigator.clipboard.writeText(`${text}\n${location.href}#${id}`);toast('게시물 링크를 복사했어요.')}catch{openUtility('공유 링크',`<p class="muted">아래 링크를 복사해 공유하세요.</p><input class="share-input" value="${location.href}#${id}" readonly>`);}}

restore();renderAll();
document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;const action=button.dataset.action;if(button.dataset.view){showScreen(button.dataset.view);return}if(button.classList.contains('compose-trigger')){composer.showModal();return}if(button.classList.contains('close-composer')){composer.close();return}if(button.classList.contains('utility-close')){closeUtility();return}if(button.classList.contains('settings-link')||button.classList.contains('square-button')){showSettings();return}if(button.classList.contains('filter-button')||button.closest('.feed-section-label')){showFilter();return}if(button.classList.contains('secondary-button')){showEditProfile();return}if(button.closest('.rail-card')){showSettings();return}if(button.closest('.rail-title')){showCreatorList();return}if(button.closest('.mini-profile')){showAccountSwitcher();return}if(button.classList.contains('follow-button')){button.textContent=button.textContent==='팔로우'?'팔로잉':'팔로우';toast(button.textContent==='팔로잉'?'팔로우했습니다.':'팔로우를 취소했어요.');return}if(button.classList.contains('composer-option')){showComposerOption(button.innerText.includes('위치')?'location':'advanced');return}if(!action)return;if(action==='show-auth'){showAuth();return}if(action==='sign-in-google'){window.MoriAuth.signInWithGoogle().catch(error=>toast(error.message||'로그인을 시작할 수 없어요.'));return}if(action==='sign-out'){window.MoriAuth.signOut().then(()=>{closeUtility();toast('로그아웃했어요.')}).catch(error=>toast(error.message||'로그아웃할 수 없어요.'));return}if(action==='close-viewer'){closeViewer();return}if(action==='close-sheet'){closeSheet();return}if(action==='open-viewer'){openViewer(button.dataset.post);return}if(action==='story'){showStory(Number(button.dataset.story));return}if(action==='like'){const post=postById(button.dataset.post);if(state.liked.has(post.id)){state.liked.delete(post.id);post.likes--}else{state.liked.add(post.id);post.likes++}persist();renderPosts();renderProfile();if(feedViewer.open)renderViewer(state.viewerPostId);return}if(action==='comments'){showComments(button.dataset.post);return}if(action==='share'||action==='copy-link'){sharePost(button.dataset.post);if(action==='copy-link')closeUtility();return}if(action==='save'){const id=button.dataset.post;if(state.saved.has(id)){state.saved.delete(id);toast('저장을 취소했어요.')}else{state.saved.add(id);toast('저장한 게시물에 추가했어요.')}persist();renderPosts();renderProfile();if(feedViewer.open)renderViewer(state.viewerPostId);return}if(action==='post-menu'){showPostMenu(button.dataset.post);return}if(action==='tag'){showTag(button.dataset.post);return}if(action==='follow'){const id=button.dataset.user;if(state.following.has(id)){state.following.delete(id);toast('팔로우를 취소했어요.')}else{state.following.add(id);toast('팔로우했습니다.')}persist();renderSuggested();return}if(action==='topic'){state.exploreTopic=button.dataset.topic;renderExplore();return}if(action==='explore-post'){openViewer(button.dataset.post);return}if(action==='profile-tab'){state.profileTab=button.dataset.tab;persist();renderProfile();return}if(action==='sort'){state.sort=button.dataset.sort;persist();renderPosts();closeUtility();return}if(action==='toggle-private'){state.privateAccount=!state.privateAccount;persist();showSettings();return}if(action==='interest-settings'){openUtility('관심사 설정',`<div class="choice-list"><button data-action="interest-picked">패션</button><button data-action="interest-picked">공간</button><button data-action="interest-picked">여행</button></div>`);return}if(action==='interest-picked'){toast(`${button.textContent} 관심사를 저장했어요.`);closeUtility();return}if(action==='account-selected'){toast('계정을 전환했어요.');closeUtility();return}if(action==='toggle-comments'){state.allowComments=!state.allowComments;showComposerOption('advanced');return}if(action==='set-location'){state.draftLocation=button.dataset.location;document.querySelector('.composer-option span').textContent=state.draftLocation;closeUtility();return}if(action==='report'){toast('신고가 접수되었습니다.');closeUtility();return}if(action==='reset-demo'){localStorage.removeItem(storageKey);location.reload();return}});

document.querySelector('#utility-content').addEventListener('submit',event=>{event.preventDefault();if(event.target.matches('.comment-form')){const post=postById(event.target.dataset.post);const input=event.target.querySelector('input');post.comments.push({user:authHandle(authState().user),text:input.value.trim()});renderPosts();showComments(post.id);return}if(event.target.id==='profile-form'){state.user={name:event.target.name.value.trim(),bio:event.target.bio.value.trim()};persist();applyProfile();toast('프로필을 저장했어요.');closeUtility();return}});
document.querySelector('#sheet-comment-form').addEventListener('submit',event=>{event.preventDefault();const input=document.querySelector('#sheet-comment-input');const text=input.value.trim();if(!text||!state.commentPostId)return;const post=postById(state.commentPostId);post.comments.push({user:authHandle(authState().user),text});input.value='';renderSheetComments();renderPosts();if(feedViewer.open)renderViewer(state.viewerPostId);});
const caption=document.querySelector('#caption');caption.addEventListener('input',()=>document.querySelector('#caption-number').textContent=caption.value.length);
document.querySelector('#upload').addEventListener('change',event=>{const file=event.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{state.draftImage=reader.result;const preview=document.querySelector('#preview');preview.style.backgroundImage=`url(${reader.result})`;preview.classList.remove('hidden');document.querySelector('#upload-label').classList.add('hidden')};reader.readAsDataURL(file)});
document.querySelector('#post-form').addEventListener('submit',event=>{event.preventDefault();const text=caption.value.trim()||'오늘의 순간을 공유합니다.';const {user}=authState();state.posts.unshift({id:`post-${Date.now()}`,handle:authHandle(user),name:authName(user),place:state.draftLocation||'방금 전',avatar:'avatar-user',image:state.draftImage||mediaSources[0],likes:0,time:'방금 전',text,tag:'My diary',tagDetail:'오늘의 기록',category:'패션',comments:[]});renderAll();composer.close();caption.value='';document.querySelector('#caption-number').textContent='0';document.querySelector('#preview').classList.add('hidden');document.querySelector('#upload-label').classList.remove('hidden');state.draftImage='';state.draftLocation='';document.querySelector('.composer-option span').textContent='위치 추가';toast('게시물을 공유했어요.');});
window.addEventListener('mori:auth-state',event=>{if(event.detail.status==='ready')refreshAuthIdentity();});
document.querySelector('#discover-search').addEventListener('input',event=>{const term=event.target.value.trim().toLowerCase();document.querySelectorAll('.explore-tile').forEach(tile=>{const post=postById(tile.dataset.post);tile.hidden=Boolean(term)&&!`${post.handle} ${post.category} ${post.place}`.toLowerCase().includes(term)});});
