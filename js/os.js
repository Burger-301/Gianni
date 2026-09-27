import { db } from './firebase-config.js';
import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const clientSelect = document.getElementById('client-select');
const form = document.getElementById('os-form');

const VALOR_HORA_FIXO = 200.00; 

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

const techPad = new SignaturePad(techCanvas);
const clientPad = new SignaturePad(clientCanvas);

document.getElementById('clear-tech').addEventListener('click', () => techPad.clear());
document.getElementById('clear-client').addEventListener('click', () => clientPad.clear());

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

// Função para efetuar upload de múltiplos ficheiros para o ImgBB
async function uploadMultiplosParaImgBB(fileInputId) {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        return []; 
    }

    const imageUrls = [];
    const apiKey = "COLOCA_AQUI_A_TUA_CHAVE_IMGBB"; // Insere aqui a tua chave da API do ImgBB

    for (let i = 0; i < fileInput.files.length; i++) {
        const file = fileInput.files[i];
        const formData = new FormData();
        formData.append("image", file);

        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: "POST",
                body: formData
            });
            
            const data = await response.json();
            if (data.success) {
                imageUrls.push(data.data.url);
            } else {
                console.error("Falha no ImgBB para a imagem:", file.name, data);
            }
        } catch (error) {
            console.error("Erro de rede no upload da imagem:", file.name, error);
        }
    }

    return imageUrls;
}

function calcularMinutosTrabalhados(startM, endM, startT, endT) {
    let minutosTotais = 0;

    if (startM && endM) {
        const diffM = new Date(endM) - new Date(startM);
        if (diffM > 0) minutosTotais += diffM / (1000 * 60);
    }

    if (startT && endT) {
        const diffT = new Date(endT) - new Date(startT);
        if (diffT > 0) minutosTotais += diffT / (1000 * 60);
    }

    if (minutosTotais < 0) minutosTotais = 0;

    const horasDecimais = minutosTotais / 60;
    const valorTotal = horasDecimais * VALOR_HORA_FIXO;

    const horasExatas = Math.floor(minutosTotais / 60);
    const minutosRestantes = minutosTotais % 60;
    const formatadoTexto = `${horasExatas}h ${minutosRestantes}m`;

    return {
        totalHours: horasDecimais.toFixed(2),
        totalHoursText: formatadoTexto,
        totalValue: valorTotal.toFixed(2)
    };
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (techPad.isEmpty() || clientPad.isEmpty()) {
        alert("Ambas as assinaturas (Manutentor e Cliente) são obrigatórias.");
        return;
    }

    alert("A enviar fotografias e a guardar a Ordem de Serviço. Aguarde um instante...");

    const imageUrls = await uploadMultiplosParaImgBB('os-image');
    const selectedOption = clientSelect.options[clientSelect.selectedIndex];

    const timeStartManha = document.getElementById('time-start-manha').value;
    const timeEndManha = document.getElementById('time-end-manha').value;
    const timeStartTarde = document.getElementById('time-start-tarde').value;
    const timeEndTarde = document.getElementById('time-end-tarde').value;

    const calc = calcularMinutosTrabalhados(timeStartManha, timeEndManha, timeStartTarde, timeEndTarde);

    const osData = {
        clientId: clientSelect.value,
        clientName: selectedOption.dataset.clientName,
        clientEmail: selectedOption.dataset.clientEmail,
        equipment: document.getElementById('equipment').value,
        brand: document.getElementById('brand').value,
        model: document.getElementById('model').value,
        serialNumber: document.getElementById('serial-number').value,
        serviceNature: document.getElementById('service-nature').value,
        serviceArea: document.getElementById('service-area').value,
        timeStartManha: timeStartManha || "",
        timeEndManha: timeEndManha || "",
        timeStartTarde: timeStartTarde || "",
        timeEndTarde: timeEndTarde || "",
        timeEnd: timeEndTarde || "",
        totalHours: calc.totalHours,
        totalHoursText: calc.totalHoursText,
        hourlyRateUsed: VALOR_HORA_FIXO.toFixed(2),
        totalValue: calc.totalValue,
        description: document.getElementById('description').value,
        paymentTerms: document.getElementById('payment-terms').value,
        imageUrls: imageUrls || [], 
        technicianName: document.getElementById('technician-name').value,
        technicianSignature: techPad.toDataURL(),
        customerSignature: clientPad.toDataURL(),
        createdAt: new Date()
    };

    try {
        await addDoc(collection(db, "service_orders"), osData);
        alert("Ordem de Serviço registada com sucesso!");
        form.reset();
        techPad.clear();
        clientPad.clear();
        
        window.location.href = "index.html"; 
    } catch (error) {
        console.error("Erro ao guardar O.S.: ", error);
        alert("Ocorreu um erro ao gravar a O.S. Verifica a consola.");
    }
});
