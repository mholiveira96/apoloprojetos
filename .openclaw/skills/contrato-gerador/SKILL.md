# Contrato Gerador

Use this skill when the user asks to create a contract, revise a contract, or generate a PDF contract from a Markdown template.

## Goal
Generate a contract in Markdown first, then convert it to PDF, using the project logo from `assets/`.

## Workflow
1. Ask the user for missing contract inputs.
2. Fill `contrato_padrao.md` or a new `contrato.md` with the provided data.
3. Convert the Markdown to PDF.
4. Return the PDF to the chat.

## Required inputs
- Contratante nome
- Contratante documento (CPF/CNPJ)
- Contratada / Apolo as needed
- Objeto do contrato
- Escopo
- Valor
- Data de início
- Data de entrega ou prazo
- Forma de pagamento
- Observações relevantes

## Notes
- Keep language formal and clear.
- Prefer concise clauses.
- Use the project logo from `assets/` in the PDF header when available.
- Save the Markdown version alongside the PDF.
- When the user asks for a contract, first request only the missing fields.
