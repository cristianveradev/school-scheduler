//import { API_BASE } from "./config";
//Aqui ponemos funciones que son mas globales

//capturamos el token de Google por URL
const params = new URLSearchParams(window.location.search);
const tokenFromUrl = params.get('token');

if (tokenFromUrl) {
    //Guardamos el token
    localStorage.setItem('token', tokenFromUrl);
    //Limpiamos la URL
    window.history.replaceState({}, document.title, window.location.pathname);
}

const menu = document.getElementById('menu');

if (menu) {
    menu.addEventListener('click', (e) => {
        const link = (e.target as HTMLElement).closest('a');

        if (!(link instanceof HTMLAnchorElement)) return;

        menu.querySelector('a.active')?.classList.remove('active');
        link.classList.add('active');

        e.preventDefault();
    });
}
const logOutBtn = document.querySelector('.logout-btn') as HTMLButtonElement;
logOutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.replace("/index.html");
});