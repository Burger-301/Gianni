import { db } from './firebase-config.js';
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const form = document.getElementById('client-form');

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const documentField = document.getElementById('document').value;
        const address = document.getElementById('address').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;

        try {
            // Guarda os dados na coleção 'clients' do Firestore
            await addDoc(collection(db, "clients"), {
                name: name,
                document: documentField,
                address: address,
                phone: phone,
                email: email,
                createdAt: new Date()
            });

            alert('Cliente cadastrado com sucesso!');
            form.reset();
            carregarClientes(); // Atualiza a lista automaticamente após gravar
        } catch (error) {
            console.error("Erro ao salvar cliente: ", error);
            alert('Erro ao cadastrar cliente. Verifica a consola.');
        }
    });
}

// Função para buscar e listar os clientes registados na página
async function carregarClientes() {
    const listDiv = document.getElementById('clients-list');
    if (!listDiv) return;

    try {
        const querySnapshot = await getDocs(collection(db, "clients"));
        if (querySnapshot.empty) {
            listDiv.innerHTML = '<p>Nenhum cliente registado.</p>';
            return;
        }

        let html = '<ul style="list-style: none; padding: 0;">';
        querySnapshot.forEach((doc) => {
            const client = doc.data();
            html += `<li style="background: #fff; padding: 10px; margin-bottom: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <strong>${client.name}</strong><br>
                <small>Doc: ${client.document} | Tel: ${client.phone}</small>
            </li>`;
        });
        html += '</ul>';
        listDiv.innerHTML = html;
    } catch (error) {
        console.error("Erro ao carregar clientes: ", error);
        listDiv.innerHTML = '<p>Erro ao carregar a lista de clientes.</p>';
    }
}

// Executa a listagem assim que a página abre
carregarClientes();
