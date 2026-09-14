import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ProfileSchema } from '@/lib/validation/profile'

test('perfil aceita dados válidos do Hub RRD', () => assert.equal(ProfileSchema.safeParse({ name: 'Vanderson Oliveira', email: 'omd.vandersonoliveira@gmail.com', phone: '5521999757549', websiteUrl: 'https://vibedocode.pro' }).success, true))
test('perfil rejeita URL insegura e telefone inválido', () => assert.equal(ProfileSchema.safeParse({ name: 'A', email: 'invalido', phone: '123', websiteUrl: 'javascript:alert(1)' }).success, false))
