import { db } from './firebase-config.js';
import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const clientSelect = document.getElementById('client-select');
const form = document.getElementById('os-form');

// 1. Função para ajustar a escala dos canvas (Garante nitidez e toque correto em telemóveis/tablets)
function ajustarCanvas(canvas) {
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
}

const techCanvas = document.getElementById('tech-pad');
const clientCanvas = document.getElementById('client-pad');

ajustarCanvas(techCanvas);
ajustarCanvas(clientCanvas);

// Inicializar as caixas de assinatura digital (Signature Pad)
const techPad = new SignaturePad(techCanvas);
const clientPad = new SignaturePad(clientCanvas);

document.getElementById('clear-tech').addEventListener('click', () => techPad.clear());
document.getElementById('clear-client').addEventListener('click', () => clientPad.clear());

// 2. Carregar clientes cadastrados para o menu de seleção (<select>)
async function loadClientsDropdown() {
    try {
        const querySnapshot = await getDocs(collection(db, "clients"));
        clientSelect.innerHTML = '<option value="">Selecione um cliente...</option>';
        
        if (querySnapshot.empty) {
            clientSelect.innerHTML = '<option value="">Nenhum cliente cadastrado</option>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const client = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            
            // Guardar o nome e email nos datasets para facilitar depois
            option.dataset.clientName = client.name || client.razaoSocial || 'Cliente sem nome';
            option.dataset.clientEmail = client.email || '';

            option.textContent = `${client.name || client.razaoSocial} (${client.document || client.cnpj || 'N/A'})`;
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

    const selectedOption = clientSelect.options[clientSelect.selectedIndex];

    const osData = {
        clientId: clientSelect.value,
        clientName: selectedOption.dataset.clientName,
        clientEmail: selectedOption.dataset.clientEmail,
        equipment: document.getElementById('equipment').value,
        serviceType: `${document.getElementById('service-nature').value} - ${document.getElementById('service-area').value}`,
        startTime: document.getElementById('time-start').value,
        endTime: document.getElementById('time-end').value,
        returnBase: document.getElementById('time-base').value,
        description: document.getElementById('description').value,
        technicianName: document.getElementById('technician-name').value,
        technicianSignature: techPad.toDataURL(),       // Imagem da assinatura em Base64
        customerSignature: clientPad.toDataURL(),     // Imagem da assinatura em Base64
        createdAt: new Date()
    };

    try {
        await addDoc(collection(db, "service_orders"), osData);
        alert("Ordem de Serviço registada com sucesso!");
        form.reset();
        techPad.clear();
        clientPad.clear();
        
        // Redirecionar para o histórico após gravar
        window.location.href = "historico.html";
    } catch (error) {
        console.error("Erro ao guardar O.S.: ", error);
        alert("Erro ao gravar O.S. Verifica a consola.");
    }
});
