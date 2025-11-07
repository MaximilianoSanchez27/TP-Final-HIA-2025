/**
 * Archivo de índice que exporta todos los modelos
 */

// Importar todos los modelos
const Rol = require("./Rol");
const Usuario = require("./Usuario");
const Club = require("./Club");
const Categoria = require("./Categoria");
const Equipo = require("./Equipo");
const Persona = require("./Persona");
const Cobro = require("./Cobro");
const Credencial = require("./Credencial");
const Noticia = require("./Noticia");
const NoticiaVistas = require("./NoticiaVistas");
const Pago = require("./Pago");
const PublicPaymentLink = require("./PublicPaymentLink");
const HeroConfig = require("./HeroConfig");
const HeroImage = require("./HeroImage");

// Exportar todos los modelos
module.exports = {
  Rol,
  Usuario,
  Club,
  Categoria,
  Equipo,
  Persona,
  Cobro,
  Credencial,
  Noticia,
  NoticiaVistas,
  Pago,
  PublicPaymentLink,
  HeroConfig,
  HeroImage
}; 