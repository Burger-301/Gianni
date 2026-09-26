import { db } from './firebase-config.js';
import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const clientSelect = document.getElementById('client-select');
const form = document.getElementById('os-form');

// 1. Inicializar as caixas de assinatura digital (Signature Pad)
const techCanvas = document.getElementById('tech-pad');
const clientCanvas = document.getElementById('client-pad');
const techPad = new SignaturePad(techCanvas);
const clientPad = new SignaturePad(clientCanvas);

document.getElementById('clear-tech').addEventListener('click', () => techPad.clear());
document.getElementById('clear-client').addEventListener('click', () => clientPad.clear());

// 2. Carregar clientes cadastrados para o menu de seleção (<select>)
async function loadClientsDropdown() {
    try {
        const querySnapshot = await getDocs(collection(db, "clients"));
        clientSelect.innerHTML = '<option value="">Selecione um cliente...</option>';
        
        querySnapshot.forEach((doc) => {
            const client = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = client.name + " (" + client.document + ")";
            clientSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Erro ao carregar clientes: ", error);
        clientSelect.innerHTML = '<option value="">Erro ao carregar clientes</option>';
    }
}

loadClientsDropdown();

// 3. Submeter a Ordem de Serviço para o Firestore
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (techPad.isEmpty() || clientPad.isEmpty()) {
        alert("Ambas as assinaturas (Manutentor e Cliente) são obrigatórias.");
        return;
    }

    const osData = {
        clientId: clientSelect.value,
        clientName: clientSelect.options[clientSelect.selectedIndex].text,
        equipment: document.getElementById('equipment').value,
        serviceNature: document.getElementById('service-nature').value,
        serviceArea: document.getElementById('service-area').value,
        timeStart: document.getElementById('time-start').value,
        timeEnd: document.getElementById('time-end').value,
        timeBase: document.getElementById('time-base').value,
        description: document.getElementById('description').value,
        technicianName: document.getElementById('technician-name').value,
        techSignature: techPad.toDataURL(),       // Imagem da assinatura em Base64
        clientSignature: clientPad.toDataURL(),   // Imagem da assinatura em Base64
        createdAt: new Date()
    };

    try {
        await addDoc(collection(db, "service_orders"), osData);
        alert("Ordem de Serviço registada com sucesso!");
        form.reset();
        techPad.clear();
        clientPad.clear();
    } catch (error) {
        console.error("Erro ao guardar O.S.: ", error);
        alert("Erro ao gravar O.S. Verifica a consola.");
    }
});