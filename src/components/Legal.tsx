import { LEGAL, SITE } from "@/lib/site";

// Textos legales: los usan la ventana de "Términos de uso" y la página /terminos.

export function TermsContent() {
  return (
    <div>
      <h4>Qué es {SITE.name}</h4>
      <p>
        Un ranking. Quien paga 1 € se pone en el puesto número 1 con su nombre y, si quiere, su foto y un enlace. Sigue ahí
        hasta que otra persona paga, y entonces todos bajan un puesto. Es una idea original de {SITE.author} ({SITE.agency}).
      </p>
      <h4>Qué compras</h4>
      <p>
        Cada coronación cuesta 1 € (IVA incluido) y te coloca en el nº 1 en el momento del pago. No compras un tiempo mínimo:
        puedes seguir arriba un día entero o diez segundos. El Pack pique cuesta 5 € e incluye 5 coronaciones: una se usa al
        pagar y las otras 4 quedan guardadas en tu perfil para volver al nº 1 cuando quieras.
      </p>
      <h4>Pago y desistimiento</h4>
      <p>El pago se hace con Stripe (tarjeta, Apple Pay o Google Pay). Nunca vemos ni guardamos los datos de tu tarjeta.</p>
      <p>
        Como la coronación es contenido digital que se entrega al momento, al pagar aceptas que pierdes el derecho de
        desistimiento en cuanto apareces en el nº 1. No se devuelve el dinero aunque alguien te supere a los pocos segundos.
      </p>
      <h4 id="t-normas">Normas</h4>
      <p>No se publica ningún nombre, foto o enlace que contenga:</p>
      <ul>
        <li>Insultos, palabrotas o palabras malsonantes, en cualquier idioma.</li>
        <li>Amenazas o incitación a la violencia.</li>
        <li>Odio o discriminación, desnudos, contenido sexual o violento, o cualquier contenido ilegal.</li>
        <li>Datos personales de otras personas (teléfonos, direcciones, correos…).</li>
        <li>Fotos de otra persona sin su permiso, o logos y marcas que no sean tuyos.</li>
        <li>Suplantación de otra persona, marca o de la propia web.</li>
        <li>Enlaces a webs para adultos, apuestas, estafas, virus o contenido ilegal.</li>
      </ul>
      <p>
        El nombre, la foto y el enlace pasan una revisión automática con inteligencia artificial <b>antes del pago</b>. Si no
        cumplen las normas, no se publican y no se cobra nada. El filtro puede equivocarse; si crees que ha rechazado algo por
        error, puedes cambiarlo y volver a intentarlo.
      </p>
      <h4>Responsabilidad</h4>
      <p>
        Cada usuario es el único responsable de lo que publica. {SITE.name} solo muestra el nombre, la foto y el enlace, y no
        respalda su contenido ni el de las webs enlazadas. Si se nos comunica un contenido ilícito, lo retiraremos. Un perfil
        retirado por incumplir las normas o por obligación legal no recupera el importe pagado.
      </p>
      <h4>Tu perfil</h4>
      <p>
        Cada nombre de usuario es único en el ranking. Si vuelves a pagar desde el mismo navegador, tu perfil sube otra vez al nº
        1 y puedes cambiar la foto y el enlace. Puedes pedir que borremos tu perfil cuando quieras escribiendo a {LEGAL.email};
        desaparecerá del ranking, sin reembolso.
      </p>
      <h4>Uso de tu nombre y tu foto</h4>
      <p>
        Al publicar, autorizas de forma gratuita y no exclusiva que tu nombre, tu foto y tu enlace aparezcan en el ranking y en
        las capturas que compartamos en las redes sociales de {SITE.name}.
      </p>
      <h4>Edad</h4>
      <p>Para pagar debes ser mayor de edad o contar con el permiso de tu madre, padre o tutor.</p>
      <h4 id="t-privacidad">Privacidad</h4>
      <p>
        Responsable: {LEGAL.titular} · NIF {LEGAL.nif} · Contacto: {LEGAL.email}.
      </p>
      <ul>
        <li>
          <b>Lo que publicas</b> (nombre, foto y enlace) es público mientras estés en el ranking.
        </li>
        <li>
          <b>Tu email</b> te lo pide Stripe al pagar para enviarte el recibo. Lo guardamos solo para poder ayudarte si hay algún
          problema con tu pago o con tu perfil.
        </li>
        <li>
          <b>El pago</b> lo gestiona Stripe, que recibe los datos necesarios para cobrar. Nosotros solo recibimos la
          confirmación del pago.
        </li>
        <li>
          <b>Prevención de abusos</b>: guardamos durante un máximo de 24 horas una huella cifrada de tu dirección IP.
        </li>
        <li>
          <b>Revisión automática</b>: tu nombre, tu foto y tu enlace se envían a Anthropic (Claude) para comprobar que cumplen
          las normas.
        </li>
        <li>
          <b>Proveedores</b>: Vercel (alojamiento web), Supabase (base de datos y fotos), Anthropic y Stripe. Algunos están
          fuera de la Unión Europea y trabajan con cláusulas contractuales tipo de la Comisión Europea.
        </li>
        <li>
          <b>En tu navegador</b> guardamos una clave de tu perfil para recordarte tu puesto. No usamos cookies de publicidad ni
          de seguimiento.
        </li>
      </ul>
      <p>
        La base legal es la ejecución del servicio que solicitas al pagar y nuestro interés legítimo en evitar abusos. Puedes
        ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a{" "}
        {LEGAL.email}, y reclamar ante la Agencia Española de Protección de Datos (aepd.es).
      </p>
      <h4 id="t-aviso">Aviso legal</h4>
      <p>
        Titular del sitio web: {LEGAL.titular} · NIF: {LEGAL.nif} · Domicilio: {LEGAL.domicilio} · Correo: {LEGAL.email}.
      </p>
      <p>
        {SITE.name} es una idea original de {SITE.author} ({SITE.agency},{" "}
        <a href={SITE.agencyUrl} target="_blank" rel="noopener">
          {SITE.agencyLabel}
        </a>
        ). El diseño, el nombre y el concepto de la web están protegidos.
      </p>
    </div>
  );
}

export function RulesContent() {
  return (
    <div>
      <p>No se publica ningún nombre, foto o enlace que contenga:</p>
      <ul>
        <li>Insultos, palabrotas o palabras malsonantes, en cualquier idioma y aunque estén disimuladas con símbolos o números.</li>
        <li>Amenazas, o frases para humillar a alguien («María José, eres una…»).</li>
        <li>Odio o discriminación, desnudos, contenido sexual o violento.</li>
        <li>Datos personales de otras personas: teléfonos, direcciones, correos…</li>
        <li>Fotos de otra persona sin su permiso, o logos y marcas que no sean tuyos.</li>
        <li>Suplantación de otra persona, de una marca o de la propia web.</li>
        <li>Enlaces a webs para adultos, apuestas, estafas o virus.</li>
      </ul>
      <p className="note" style={{ marginTop: 14 }}>
        <b>Si algo no cumple las normas, no se publica y no se te cobra nada.</b> Lo revisamos antes del pago: primero con un
        filtro de palabras y después con inteligencia artificial, que también mira la foto.
      </p>
    </div>
  );
}
