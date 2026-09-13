import request from 'supertest';

export async function loginAsAluno(app, { email, senha }) {
  const resposta = await request(app).post('/api/auth/login').send({ email, senha });

  if (resposta.status !== 200) {
    throw new Error(
      `Falha ao logar como aluno: ${resposta.status} ${JSON.stringify(resposta.body)}`
    );
  }

  return resposta.body.token;
}

export default { loginAsAluno };
