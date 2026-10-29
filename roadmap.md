# Ajustes de Almoxarifado
- [x] Terminar edição da data da RC, aplicação aos itens, tempo até chegada e preservação na importação.
- [x] Preparar alteração dos campos em scripts/compras_data_rc_manual.sql.
- [ ] Aplicar os campos na base usada pelo app: conexão disponível administra outra instância; a base real retornou 42703 (colunas inexistentes).
- [x] Corrigir leitura de números da planilha SAP e testar 2.949,00 = 2949 (10 testes passaram).
- [x] Verificar compilação e página pública: sem erros de execução, estoque direciona ao login.
- [ ] Validar edição e importação autenticadas: sessão própria indisponível; requer login na prévia e ativação dos campos na base real.