import { db } from './firebase-config.js';
import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const clientSelect = document.getElementById('client-select');
const form = document.getElementById('os-form');

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

// Função para efetuar upload de múltiplos anexos dinâmicos com título para o ImgBB
async function uploadAnexosParaImgBB() {
    const rows = document.querySelectorAll('.anexo-row');
    if (!rows || rows.length === 0) {
        return []; 
    }

    const attachments = [];
    const apiKey = "760f9d5337196e65847ca8351f92398f";

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const titleInput = row.querySelector('.anexo-titulo');
        const fileInput = row.querySelector('.anexo-ficheiro');
        
        const title = titleInput ? titleInput.value.trim() || `Anexo ${i + 1}` : `Anexo ${i + 1}`;
        
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            continue; // Ignora linhas sem ficheiro selecionado
        }

        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append("image", file);

        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: "POST",
                body: formData
            });
            
            const data = await response.json();
            if (data.success) {
                attachments.push({
                    title: title,
                    url: data.data.url
                });
            } else {
                console.error("Falha no ImgBB para a imagem:", file.name, data);
            }
        } catch (error) {
            console.error("Erro de rede no upload da imagem:", file.name, error);
        }
    }

    return attachments;
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (techPad.isEmpty() || clientPad.isEmpty()) {
        alert("Ambas as assinaturas (Manutentor e Cliente) são obrigatórias.");
        return;
    }

    alert("A processar dados e a guardar a Ordem de Serviço. Aguarde um instante...");

    const attachments = await uploadAnexosParaImgBB();
    const selectedOption = clientSelect.options[clientSelect.selectedIndex];

    // 1. CÁLCULO DE HORAS TRABALHADAS
    const temHora = document.getElementById('tem-hora').value === 'sim';
    const valorHora = parseFloat(document.getElementById('valor-hora').value) || 0;
    const timeStartManha = document.getElementById('time-start-manha').value;
    const timeEndManha = document.getElementById('time-end-manha').value;
    const timeStartTarde = document.getElementById('time-start-tarde').value;
    const timeEndTarde = document.getElementById('time-end-tarde').value;

    let minutosTotais = 0;
    if (temHora) {
        if (timeStartManha && timeEndManha) {
            const diffM = new Date(timeEndManha) - new Date(timeStartManha);
            if (diffM > 0) minutosTotais += diffM / (1000 * 60);
        }
        if (timeStartTarde && timeEndTarde) {
            const diffT = new Date(timeEndTarde) - new Date(timeStartTarde);
            if (diffT > 0) minutosTotais += diffT / (1000 * 60);
        }
    }
    if (minutosTotais < 0) minutosTotais = 0;
    
    const horasDecimais = minutosTotais / 60;
    const valorHorasTotal = temHora ? (horasDecimais * valorHora) : 0;

    const horasExatas = Math.floor(minutosTotais / 60);
    const minutosRestantes = minutosTotais % 60;
    const totalHoursText = `${horasExatas}h ${minutosRestantes}m`;

    // 2. CÁLCULO DE KM (DESLOCAMENTO)
    const temKm = document.getElementById('tem-km').value === 'sim';
    const valorKm = parseFloat(document.getElementById('valor-km').value) || 0;
    const kmIda = parseFloat(document.getElementById('km-ida').value) || 0;
    const kmVolta = parseFloat(document.getElementById('km-volta').value) || 0;
    const totalKm = kmIda + kmVolta;
    const valorKmTotal = temKm ? (totalKm * valorKm) : 0;

    // 3. CÁLCULO DE COMBUSTÍVEL
    const temCombustivel = document.getElementById('tem-combustivel').value === 'sim';
    const valorLitro = parseFloat(document.getElementById('valor-litro').value) || 0;
    const combustivelLitros = parseFloat(document.getElementById('combustivel-litros').value) || 0;
    const valorCombustivelTotal = temCombustivel ? (combustivelLitros * valorLitro) : 0;

    // 4. VALOR TOTAL GERAL
    const totalValue = valorHorasTotal + valorKmTotal + valorCombustivelTotal;

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
        
        // Dados de Hora
        temHora: temHora ? 'sim' : 'nao',
        valorHora: valorHora.toFixed(2),
        timeStartManha: timeStartManha || "",
        timeEndManha: timeEndManha || "",
        timeStartTarde: timeStartTarde || "",
        timeEndTarde: timeEndTarde || "",
        totalHours: horasDecimais.toFixed(2),
        totalHoursText: totalHoursText,
        valorHorasTotal: valorHorasTotal.toFixed(2),

        // Dados de Deslocamento (Km)
        temKm: temKm ? 'sim' : 'nao',
        valorKm: valorKm.toFixed(2),
        kmIda: kmIda,
        kmVolta: kmVolta,
        totalKm: totalKm,
        valorKmTotal: valorKmTotal.toFixed(2),

        // Dados de Combustível
        temCombustivel: temCombustivel ? 'sim' : 'nao',
        valorLitro: valorLitro.toFixed(2),
        combustivelLitros: combustivelLitros,
        valorCombustivelTotal: valorCombustivelTotal.toFixed(2),

        totalValue: totalValue.toFixed(2),
        description: document.getElementById('description').value,
        paymentTerms: document.getElementById('payment-terms').value,
        attachments: attachments || [], 
        imageUrls: attachments.map(a => a.url), 
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
