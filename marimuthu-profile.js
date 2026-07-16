(()=>{
  const AVATAR_SRC='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5Ojf/2wBDAQoKCg0MDRoPDxo3JR8lNzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzf/wAARCABgAGADASIAAhEBAxEB/8QAHAABAAAHAQAAAAAAAAAAAAAAAAECAwUGBwgE/8QANhAAAQMCAwQIBQMFAQAAAAAAAQACAwQRBRIhBjFBgQcTIjJRYXGxQlKCkcFEYtElM0OSocL/xAAaAQACAwEBAAAAAAAAAAAAAAAAAQIDBAUG/8QAIBEAAgICAwADAQAAAAAAAAAAAAECAwQREiExEyJBYf/aAAwDAQACEQMRAD8A3QiIokgiIgAigSBxUC8JbQ9EyKUPCiHAo2g0RRETEEREAAiIgATZUpJA0EkgAbyVCeVsbHPe4Na0EkngFp3pQ6RZ6aeTBsElMVQ3s1E7TrD+xp+f5nfDuGtyopSnLjEbaitszjabb/AdnXmGsqTJVD9NA3PJzGgb9RB8lhVX0zVBke2gwC7W3v19SA4623Nb+StWYNQOr5utcbjMbudr2jx8zxWeYRsdTSgFodGDva11geF1TddTTLi+2aqMS26PJdIvOH9NoDv6lgZDTxgnufs4flZxs3t3s/tLIIsPq+rqj+mnGSQ+g3O+kla1xfZumpqZ0TIWNLRYg6k81rOvpn0NWWtJbY5mEXBHgbqWPZVkNxS0yOTj2Y6Ut7R1419t6qA3Wnui3pImrpI8Dx+UyVJ0pap3el/Y7xd4HjuOtituQSNe1rmuDmuFwRuIVjUq5cZGdNSW0VkRFIQUCdFFSv0ak/Bo8FSetqWRfBG0zP8AOxswfe5+lcjyuLpXucS4lxJJNyTddbRG8tc/jmazkGA+7iuSjbrTm7ubW3hdX4q+rZVd6jI9npY6fDZZL5nBxNm8tAs+2X2kwqQsb1VeJCO3KxgDGcydywbDcPioceFHFNnhexsjDe9r8D5rPq2losNwoiSeCPOARuB14ucefiVxLnBzb1tvtHoaYzVajvSXTK+1mK0tPHkhw6orXudYyNmbpcaaeOtlqvaDPKymmfFle+N2YAjSztPdbClrsJo6qkdJicAZV0wJyWNvAkHT2Vk2wip4KXrqN8csUsUgzM3Fpbv+4HNWYk+Nkfrpsqy6+VctS2ka+he6OaN7HFr2uBa5psQQdCF1vTHqamSH4XNE0fkCe0OTtfqXI7O+31C62n7M9E8cc7D6Fmb3YF18tdJnDofZcwbgKKkj1ap1QvC1iykk7qnUHC4KALZFpLWt8S2QehZl92FclP77vUrraciGYSO0aQY3nwB3HkbciVzHhWyW0GM1ktPh2E1Mj45HMkLmZGxuBsQ5zrAELRitJNMquW2ivs7iXX1tFTVLWXiu1k3xZflP8rJMG2fdUY3U12PRT1NPmtG2GcAg7ibEHhYAab1keyHRBXYe6esxippXTvpZI4IIruySOFg4uNhp5DjvVvbUTUjzHUsfTTNdkIfoCRpa/Ajz9lz8xKE+Vf6dPDk7IcZ/jLltBs9sy3DoqegwuaR+TK2R81hEDxNu865O9a1x5s+FYXTYTJUiV+d7n5D2cl9B97lbFxDEo6qOGMARuAtZkuYu5D3Xtp9gMO2y2bjkfK6ir6eeRjahjA7M0gENcOI8NdNfFLFs5Wrl4Sy4cKfr74aMZ32+oXW8+slIPlzPP+uX/wBLQGO9FW1ODSh0VIMRgzACWjOY7+LDqP8Ao81v5h62a41AAa30HHmb8rLflSTSSOXSmm9lxi7oU1lBgs0KZUrwsCIiYjyVkWZp0BuNQRcFUsOqXRAU0xJa3+28ncPld+HceOu/3uAcF4aqlJOaMkO8QotNPaJfxlyPd8SsU2rwUuZJWtYJHf5g0aPHjbxHtZXaOunpxlljzAcR/Cnfi0bmWMZPO3uFCzjZHjInTOVU1KJrGqpoY8ho47SuOQNa0XN9OG9Z/sng9ZheHuEpYyWZ/WPY4ZsugFtOOnJW+GhpoMYbiETXWYS6OBzgWNJFr6An0V1lqqqr7J7p4AWb9t55nksuPV8bcpds2ZeSrYqEPD0V1Z1g6mEktOjnA7/2j8nkNd1WjhIGZ29U6Skscz9SeJXvaA0WC2JNvbMDf4iKIimRCIiACIiAKbomO3hUX0cZ1sF6kSA8jaKMG9lXZCxu4KoiBgBERMQREQB//9k=';
  const AUTHOR_NAME='சுப மாரிமுத்து';
  const isMarimuthuPage=()=>/^\/(?:marimuthu|maimurhuayya)(?:\/|$)/i.test(location.pathname);
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  const installStyles=()=>{
    if(document.getElementById('marimuthuAuthorImageStyles'))return;
    const style=document.createElement('style');
    style.id='marimuthuAuthorImageStyles';
    style.textContent='.marimuthuAuthorLine{display:flex!important;align-items:center;justify-content:center;gap:12px}.marimuthuAuthorAvatar{width:58px!important;height:58px!important;flex:0 0 58px;object-fit:cover!important;object-position:center!important;border-radius:50%!important;border:3px solid rgba(255,255,255,.92)!important;background:#fff;box-shadow:0 8px 22px rgba(0,0,0,.2)!important;margin:0!important}.profile .marimuthuAuthorLine{color:#6b2f1c}.profile .marimuthuAuthorAvatar{border-color:#f6e3b5!important}.profileBar .marimuthuAuthorAvatar{width:62px!important;height:62px!important;flex-basis:62px}@media(max-width:520px){.marimuthuAuthorLine{gap:9px}.marimuthuAuthorAvatar,.profileBar .marimuthuAuthorAvatar{width:50px!important;height:50px!important;flex-basis:50px}}';
    document.head.appendChild(style);
  };
  const decorate=()=>{
    const targets=[...document.querySelectorAll('.profileBar h2,.profile .credit,.credit')].filter(node=>String(node.textContent||'').includes(AUTHOR_NAME));
    targets.forEach(target=>{
      if(target.querySelector('.marimuthuAuthorAvatar'))return;
      let image=null;
      const profile=target.closest('.profile');
      if(profile)image=profile.querySelector('img.portrait');
      if(!image)image=document.createElement('img');
      image.src=AVATAR_SRC;
      image.alt='';
      image.setAttribute('aria-hidden','true');
      image.removeAttribute('srcset');
      image.className='marimuthuAuthorAvatar';
      target.classList.add('marimuthuAuthorLine');
      target.prepend(image);
    });
  };
  if(!isMarimuthuPage())return;
  ready(()=>{installStyles();decorate()});
})();
