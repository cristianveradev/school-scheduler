let errorMsg = document.getElementById("errorMsg") as HTMLElement;
let form = document.getElementById("Login") as HTMLFormElement;

form.addEventListener("submit", (e) => {
    e.preventDefault();
    errorMsg.textContent = ""

    let usuari = (form.elements.namedItem("usuari") as HTMLInputElement).value;
    let password = (form.elements.namedItem("password") as HTMLInputElement).value;

    //Validación simple
    if (password.length < 6) {
        errorMsg.textContent = "La contraseña debe tener al menos 6 caracteres.";
        return;
    }

    console.log (usuari);
    console.log (password);
  // Simulación de autenticación
    if(errorMsg.textContent == ""){
        envioLogin(usuari, password);
    }
});

async function envioLogin(usuari: string, password: string) {
    
    let options = {
        method: "POST",
        headers:{
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            usuari: usuari,
            password: password
        })
    }
    let response = await fetch("http://localhost:3100/api/auth/login", options);
    let body = await response.json();

    if(body.message == "Usuari o contrasenya incorrectes"){
        let errorMsg = document.getElementById("errorMsg") as HTMLElement;
        errorMsg.textContent = "El usuari o contrasenya es incorrecte.";
        return;
    }else{
        window.localStorage.setItem("token", body.token);

        let token = window.localStorage.getItem("token");
        
        redirectInici();
    }
}

function redirectInici(){
    window.location.replace("/html/inici.html");
}
