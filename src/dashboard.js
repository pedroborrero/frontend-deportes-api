import "./style.css"
import QRCode from 'qrcode';


// 1. Configuración de la API
//const API_URL = import.meta.env.VITE_API_URL;
const API_URL = import.meta.env.VITE_API_URL;
// 2. Recuperar datos de la sesión del localStorage
const token = localStorage.getItem('token');
const rol = localStorage.getItem('rol');
const nombre = localStorage.getItem('nombre');

// 3. Seguridad: Si no hay token, no has logueado, te echo al login
if (!token) {
  window.location.href = '/login.html';
}

// 4. Rellenar la barra de navegación con los datos del usuario
document.getElementById('userName').textContent = nombre;
document.getElementById('userRole').textContent = rol;

// 5. Mostrar panel de Admin si el rol es administrador
if (rol === 'admin') {
  document.getElementById('admin-panel').style.display = 'block';
}

// 6. Cargar los espacios de la API
const container = document.getElementById('espacios-container');

async function loadEspacios() {
  try {
    const response = await fetch(`${API_URL}/espacios`, {
      method: 'GET',
      headers: {
        // Le pasamos el token aunque GET sea público, por si acaso
        'Authorization': `Bearer ${token}`
      }
    });

    const espacios = await response.json();
    container.innerHTML = ''; // Limpiar "Cargando..."

    // Pintar las tarjetas de cada espacio
    espacios.forEach(espacio => {
      const card = document.createElement('div');
      card.className = 'card';

      const statusText = espacio.disponible ? 'Abierto' : 'Cerrado';
      const statusClass = espacio.disponible ? 'status' : 'status cerrado';

      card.innerHTML = `
        <h3>${espacio.nombre}</h3>
        <p><strong>Tipo:</strong> ${espacio.tipo}</p>
        <p><strong>Ubicación:</strong> ${espacio.ubicacion}</p>
        <p><strong>Capacidad:</strong> ${espacio.capacidad_maxima} personas</p>
        <p><strong>Estado:</strong> <span class="${statusClass}">${statusText}</span></p>
      `;

      // LÓGICA DE ROLES EN EL FRONTEND (Botones)
      if (rol === 'admin') {
        // El admin ve el botón de borrar
        const btnBorrar = document.createElement('button');
        btnBorrar.className = 'btn-borrar';
        btnBorrar.textContent = '🗑️ Borrar Espacio';
        btnBorrar.onclick = () => deleteEspacio(espacio.id);
        card.appendChild(btnBorrar);
      } else if (espacio.disponible) {
        // El ciudadano ve el botón de reservar (solo si está abierto)
        const btnReservar = document.createElement('button');
        btnReservar.className = 'btn-reservar';
        btnReservar.textContent = '📅 Reservar';
        btnReservar.onclick = () => openBookingPanel(espacio.id, espacio.nombre);
        card.appendChild(btnReservar);
      }

      container.appendChild(card);
    });

  } catch (error) {
    container.innerHTML = '<p style="color:red;">Error al conectar con la API.</p>';
  }
}
// Variables globales para saber qué espacio estamos reservando
let currentSpaceId = null;
let currentSpaceName = '';

// FUNCIÓN PARA ABRIR EL FORMULARIO
function openBookingPanel(espacioId, espacioNombre) {
    currentSpaceId = espacioId;
    currentSpaceName = espacioNombre;
   
    // Actualizamos el HTML del panel
    document.getElementById('bookingSpaceName').textContent = espacioNombre;
   
    // Mostramos el panel y hacemos scroll para que se vea
    const panel = document.getElementById('bookingPanel');
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth' });
}

// FUNCIÓN PARA CERRAR EL FORMULARIO (La usa el botón Cancelar del HTML)
function closeBookingPanel() {
    document.getElementById('bookingPanel').style.display = 'none';
    document.getElementById('bookingMsg').textContent = ''; // Limpiar mensajes
}


// 7. Función de Borrar Espacio (Solo la ejecutarán los Admin)
async function deleteEspacio(id) {
  if (!confirm('¿Seguro que quieres borrar este espacio? Esta acción es irreversible.')) return;

  try {
    const response = await fetch(`${API_URL}/espacios/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` } // El guardia pide el carnet
    });

    if (response.ok) {
      alert('Espacio borrado correctamente');
      loadEspacios(); // Recargamos la lista de espacios
    } else {
      const data = await response.json();
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    alert('Error de conexión con el servidor');
  }
}


// 9. NUEVA FUNCIÓN: Generar el QR
function generarTicketQR(reservaId, nombreEspacio, fecha, hora) {
  const ticketContainer = document.getElementById('ticket-container');
  const canvas = document.getElementById('qrCanvas');
  // La URL que tendrá el QR. Apunta al endpoint de verificación del backend.
  // Cuando el conserje lo escanee, su navegador irá a esta URL.Esta es la url que codifica el codigoqr
  const urlVerificacion = `${API_URL}/reservas/verificar/${reservaId}`;

  // Generar el QR en el canvas
  QRCode.toCanvas(canvas, urlVerificacion, { width: 200 }, function (error) {
    if (error) console.error(error);

    // Mostrar el ticket
    ticketContainer.style.display = 'block';

    // Opcional: Scroll suave hacia el ticket
    ticketContainer.scrollIntoView({ behavior: 'smooth' });
  });
}


// 9. Cerrar Sesión
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear(); // Borramos token, rol y nombre
  window.location.href = '/index.html'; // Volvemos al escaparate público
});

// 10. Inicializar: Cargar los espacios al entrar al dashboard
loadEspacios();
// ==========================================
// 11. LÓGICA DE ADMIN: CREAR ESPACIO
// ==========================================
// 1. Recoger los datos del formulario
const createEspacioForm = document.getElementById('createEspacioForm');
const createMsg = document.getElementById('createMsg');

createEspacioForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  createMsg.textContent = ''; // Limpiar mensaje

  // 1. Recoger los datos del formulario
  const nuevoEspacio = {
    nombre: document.getElementById('espNombre').value,
    tipo: document.getElementById('espTipo').value,
    ubicacion: document.getElementById('espUbicacion').value,
    capacidad_maxima: parseInt(document.getElementById('espCapacidad').value),
    disponible: document.getElementById('espDisponible').checked ? 1 : 0 // Checkbox a 1 o 0
  };

  try {
    // 2. Enviar a la API (Ruta protegida de Admin)
    const response = await fetch(`${API_URL}/espacios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // ¡Obligatorio!
      },
      body: JSON.stringify(nuevoEspacio)
    });

    const data = await response.json();

    // 3. Gestión de respuesta
    if (response.ok) {
      createMsg.textContent = `✅ ¡Espacio "${data.nombre}" creado con éxito!`;
      createEspacioForm.reset(); // Limpiar formulario

      // 4. Recargar la lista de espacios para que aparezca la nueva tarjeta
      loadEspacios();
    } else {
      createMsg.style.color = 'red';
      createMsg.textContent = `❌ Error: ${data.error}`;
    }

  } catch (error) {
    createMsg.style.color = 'red';
    createMsg.textContent = 'Error de conexión';
  }
});

// LÓGICA DEL FORMULARIO DE RESERVA
document.getElementById('bookingForm').addEventListener('submit', async (e) => {
   e.preventDefault(); // Evita que recargue la página
 
   const msgDiv = document.getElementById('bookingMsg');
   msgDiv.style.color = 'red'; // Por defecto errores en rojo
 
   const fecha = document.getElementById('bookDate').value;
   const hora_inicio = document.getElementById('bookStart').value;
   const hora_fin = document.getElementById('bookEnd').value;

   // --- VALIDACIONES DE FRONTEND ---
   const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
   if (fecha < today) {
       msgDiv.textContent = "❌ No puedes reservar en una fecha pasada.";
       return;
   }

   if (hora_fin <= hora_inicio) {
       msgDiv.textContent = "❌ La hora de fin debe ser posterior a la hora de inicio.";
       return;
   }

   // --- FETCH A LA API (Lo que antes hacía crearReserva) ---
   try {
       const response = await fetch(`${API_URL}/reservas`, {
           method: 'POST',
           headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${token}`
           },
           body: JSON.stringify({
               espacio_id: currentSpaceId, // Usamos la variable global
               fecha,
               hora_inicio,
               hora_fin
           })
       });

       const data = await response.json();

       if (response.ok) {
           // ¡Éxito! Mensaje en verde en el DOM
           msgDiv.style.color = 'green';
           msgDiv.textContent = `✅ ¡Reserva confirmada! ID: ${data.id}`;
         
           // Opcional: Generar QR aquí si lo tenías implementado
           generarTicketQR(data.id, currentSpaceName, fecha, hora_inicio);
         
           // Limpiamos el formulario tras 3 segundos y ocultamos el panel
           setTimeout(() => {
               document.getElementById('bookingForm').reset();
               closeBookingPanel();
               loadEspacios(); // Recargar para actualizar contadores etc.
           }, 3000);

       } else if (response.status === 409) {
           msgDiv.textContent = `❌ Conflictos: ${data.error}`;
       } else {
           msgDiv.textContent = `❌ Error: ${data.error}`;
       }

   } catch (error) {
       msgDiv.textContent = '❌ Error de conexión con el servidor';
   }
});
