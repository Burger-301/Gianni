import { db } from './firebase-config.js';
import { collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const form = document.getElementById('client-form');
const clientsListDiv = document.getElementById('clients-list');

// 1. Guardar novo cliente no Firestore ao submeter o formulário
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const documentId = document.getElementById('document').value;
    const address = document.getElementById('address').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;

    try {
        await addDoc(collection(db, "clients"), {
            name: name,
            document: documentId,
            address: address,
            phone: phone,
            email: email,
            createdAt: new Date()
        });
        
        alert("Cliente cadastrado com sucesso!");
        form.reset(); // Limpa o formulário
    } catch (error) {
        console.error("Erro ao cadastrar cliente: ", error);
        alert("Erro ao salvar cliente. Verifica a consola.");
    }
});

// 2. Ouvir e listar os clientes do Firestore em tempo real
function loadClients() {
    onSnapshot(collection(db, "clients"), (snapshot) => {
        clientsListDiv.innerHTML = "";
        
        if (snapshot.empty) {
            clientsListDiv.innerHTML = "<p>Nenhum cliente registado ainda.</p>";
            return;
        }

        let html = "<ul style='list-style: none; padding: 0;'>";
        snapshot.forEach((doc) => {
            const client = doc.data();
            html += `
                <li style="background: #fff; margin-bottom: 10px; padding: 12px; border-radius: 5px; border: 1px solid #ddd; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <strong style="font-size: 16px; color: #333;">${client.name}</strong><br>
                    <span style="color: #666; font-size: 14px;">
                        <strong>CNPJ/CPF:</strong> ${client.document} | <strong>Contacto:</strong> ${client.phone}<br>
                        <strong>Morada:</strong> ${client.address} | <strong>E-mail:</strong> ${client.email}
                    </span>
                </li>
            `;
        });
        html += "</ul>";
        clientsListDiv.innerHTML = html;
    });
}

// Executar a função de listagem
loadClients();
