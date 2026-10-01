import assert from "node:assert/strict";
import {
  equipeChave,
  equipeChaveFinal,
  equipeIndiceCor,
  equipeRotulo,
  equipeRotuloFinal,
  integranteChaveFinal,
  integranteRotuloFinal,
} from "../src/lib/equipe-utils.ts";

assert.equal(equipeChave(null), "");
assert.equal(equipeChave("   "), "");
assert.equal(equipeChave("  VINICIUS/Alexandre  &  VINICIUS, "), "ALEXANDRE & VINICIUS");
assert.equal(equipeChave("A&B"), "A & B");
assert.equal(equipeChave("ERICK & PAULO SÉRGIO"), equipeChave("Paulo Sergio + Erick"));
assert.notEqual(equipeChave("ANDRE & RONALDO"), equipeChave("ANDRE & RONALDO & VAGNER"));
assert.notEqual(equipeChave("ERICK"), equipeChave("ERICK & PAULO SÉRGIO"));
const aliasesIntegrante = [
  { alias_nome: "JONATA", destino_nome: "JHONATA" },
  { alias_nome: "JHONATA", destino_nome: "JHONATA" },
];
assert.equal(equipeChaveFinal("JONATA / ERICK", [], aliasesIntegrante), "ERICK & JHONATA");
assert.equal(integranteChaveFinal("JONATA", aliasesIntegrante), "JHONATA");
assert.equal(integranteRotuloFinal("JONATA", aliasesIntegrante), "JHONATA");
assert.equal(
  equipeChaveFinal("ERICK & PAULO SERGIO", [
    { alias_chave: "ERICK & PAULO SERGIO", destino_chave: "EQUIPE A", destino_rotulo: "Equipe A" },
  ]),
  "EQUIPE A",
);
assert.equal(
  equipeChaveFinal("A", [
    { alias_chave: "A", destino_chave: "B", destino_rotulo: "Equipe B" },
    { alias_chave: "B", destino_chave: "C", destino_rotulo: "Equipe C" },
  ]),
  "C",
);
assert.equal(
  equipeChaveFinal("A", [
    { alias_chave: "A", destino_chave: "B", destino_rotulo: "Equipe B" },
    { alias_chave: "B", destino_chave: "A", destino_rotulo: "Equipe A" },
  ]),
  "A",
);
assert.equal(
  equipeRotuloFinal(
    "ERICK & JHONATA",
    [{ texto: "ERICK & JONATA", qtd: 12 }],
    [],
    aliasesIntegrante,
  ),
  "ERICK & JHONATA",
);
assert.equal(
  equipeRotulo([
    { texto: " ERICK  & PAULO SERGIO ", qtd: 40 },
    { texto: "ERICK & PAULO SÉRGIO", qtd: 204 },
  ]),
  "ERICK & PAULO SÉRGIO",
);
assert.equal(
  equipeRotulo([
    { texto: "VINICIUS & ALEXANDRE", qtd: 5 },
    { texto: "ALEXANDRÉ & VINÍCIUS", qtd: 5 },
  ]),
  "ALEXANDRÉ & VINÍCIUS",
);
assert.equal(equipeIndiceCor("ERICK & PAULO SERGIO", 8), equipeIndiceCor("ERICK & PAULO SERGIO", 8));

console.log("Testes de equipe-utils passaram.");