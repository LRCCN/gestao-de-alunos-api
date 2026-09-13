import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import request from 'supertest';
import { expect } from 'chai';

import app from '../../src/app.js';
import { loginAsAdmin } from '../helpers/adminAuth.js';
import { loginAsAluno } from '../helpers/alunoAuth.js';
import Aluno from '../../src/models/aluno.model.js';
import Matricula from '../../src/models/matricula.model.js';
import Trabalho from '../../src/models/trabalho.model.js';

const cenarios = JSON.parse(
  fs.readFileSync(fileURLToPath(new URL('../fixtures/cadastroEntregaTrabalho.json', import.meta.url)))
);

async function limparAlunosDosCenarios() {
  const emails = cenarios.map((cenario) => cenario.novoAluno.email);
  const alunosExistentes = await Aluno.find({ email: { $in: emails } });
  const idsExistentes = alunosExistentes.map((aluno) => aluno.id);

  if (idsExistentes.length === 0) return;

  await Promise.all([
    Trabalho.deleteMany({ alunoId: { $in: idsExistentes } }),
    Matricula.deleteMany({ alunoId: { $in: idsExistentes } }),
    Aluno.deleteMany({ _id: { $in: idsExistentes } }),
  ]);
}

describe('Fluxo: admin cadastra aluno e aluno registra entrega de trabalho', () => {
  let adminToken;

  before(async () => {
    adminToken = await loginAsAdmin(app);
    await limparAlunosDosCenarios();
  });

  cenarios.forEach((cenario) => {
    describe(`Cenário: ${cenario.descricao}`, () => {
      let alunoCriado;
      let alunoToken;

      it('deve cadastrar o aluno como administrador', async () => {
        const resposta = await request(app)
          .post('/api/admin/alunos')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(cenario.novoAluno);

        expect(resposta.status).to.equal(201);
        expect(resposta.body).to.include({
          nome: cenario.novoAluno.nome,
          email: cenario.novoAluno.email,
          matricula: cenario.novoAluno.matricula,
        });
        expect(resposta.body).to.not.have.property('senha');

        alunoCriado = resposta.body;
      });

      it('deve matricular o aluno na disciplina do cenário', async () => {
        const resposta = await request(app)
          .post(`/api/admin/disciplinas/${cenario.disciplinaId}/matriculas`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ alunoId: alunoCriado.id });

        expect(resposta.status).to.equal(201);
      });

      it('deve logar como o aluno recém-cadastrado', async () => {
        alunoToken = await loginAsAluno(app, {
          email: cenario.novoAluno.email,
          senha: cenario.novoAluno.senha,
        });

        expect(alunoToken).to.be.a('string').that.is.not.empty;
      });

      it('deve registrar a entrega do trabalho como aluno', async () => {
        const resposta = await request(app)
          .post(`/api/alunos/${alunoCriado.id}/trabalhos`)
          .set('Authorization', `Bearer ${alunoToken}`)
          .send({ disciplinaId: cenario.disciplinaId, ...cenario.trabalho });

        expect(resposta.status).to.equal(201);
        expect(resposta.body).to.include({
          alunoId: alunoCriado.id,
          disciplinaId: cenario.disciplinaId,
          titulo: cenario.trabalho.titulo,
          status: 'entregue',
        });
      });
    });
  });
});
