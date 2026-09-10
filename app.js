function login(){
const email=document.getElementById('email').value;
if(!email){alert('Введите email');return;}
document.querySelector('.login').classList.add('hidden');
document.getElementById('dashboard').classList.remove('hidden');
let role='Менеджер';
if(email.includes('ivan')) role='Администратор проекта';
document.getElementById('role').innerText=role;
}
