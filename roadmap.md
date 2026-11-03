# Ajustes de Almoxarifado
- [x] Terminar edição da data da RC, aplicação aos itens, tempo até chegada e preservação na importação.
- [x] Preparar alteração dos campos em scripts/compras_data_rc_manual.sql.
- [x] Aplicar os campos na base usada pelo app: usuário aplicou SQL; consulta confirmou origem e instante da edição disponíveis.
- [x] Corrigir leitura de números da planilha SAP e testar 2.949,00 = 2949 (10 testes passaram).
- [x] Verificar compilação e página pública: sem erros de execução, estoque direciona ao login.
- [ ] Validar edição e importação autenticadas: sessão da base externa indisponível; requer teste do usuário na prévia.
- [x] Corrigir indicador de data manual: reproduzido erro de TooltipProvider e verificado editor sem falha após correção; 10 testes passaram.