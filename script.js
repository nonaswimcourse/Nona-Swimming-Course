const slider=document.querySelector('.gallery');
const leftBtn=document.querySelector('.left');
const rightBtn=document.querySelector('.right');

let isDown=false,startX,scrollLeft;

// DRAG
slider.addEventListener('mousedown',(e)=>{
isDown=true;
startX=e.pageX-slider.offsetLeft;
scrollLeft=slider.scrollLeft;
});

slider.addEventListener('mouseup',()=>isDown=false);
slider.addEventListener('mouseleave',()=>isDown=false);

slider.addEventListener('mousemove',(e)=>{
if(!isDown) return;
e.preventDefault();
const x=e.pageX-slider.offsetLeft;
const walk=(x-startX)*2;
slider.scrollLeft=scrollLeft-walk;
});

// TOUCH
slider.addEventListener('touchstart',(e)=>{
startX=e.touches[0].pageX;
scrollLeft=slider.scrollLeft;
});

slider.addEventListener('touchmove',(e)=>{
const x=e.touches[0].pageX;
const walk=(x-startX)*2;
slider.scrollLeft=scrollLeft-walk;
});

// BUTTON
rightBtn.addEventListener('click',()=>slider.scrollLeft+=320);
leftBtn.addEventListener('click',()=>slider.scrollLeft-=320);

// REVEAL
function reveal(){
document.querySelectorAll('.reveal').forEach(el=>{
if(el.getBoundingClientRect().top<window.innerHeight-100){
el.classList.add('active');
}
});
}
window.addEventListener('scroll',reveal);
reveal();

// LOADING SCREEN HANDLER
window.addEventListener('load', () => {
    const loader = document.getElementById('loader-wrapper');
    
    // Memberikan sedikit delay 1 detik agar animasi terlihat sebentar
    setTimeout(() => {
        loader.classList.add('loader-hidden');
    }, 1500); 
});
