import type { DungeonState, HeroState, EnemyState, Projectile, LootDrop, Particle, DamageNumber, AttackArc, Camera, Vec2 } from './types'

const ROOM_W = 760
const ROOM_H = 560
const WALL = 20
const TILE_SIZE = 40

export class GameRenderer {
  private ctx: CanvasRenderingContext2D
  private width: number
  private height: number

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx
    this.width = width
    this.height = height
  }

  render(state: DungeonState, camera: Camera) {
    const ctx = this.ctx
    ctx.save()

    // 屏幕震动（增强）
    let shakeX = 0, shakeY = 0
    if (state.screenShake > 0) {
      const intensity = Math.min(state.screenShake / 50, 8)
      shakeX = (Math.random() - 0.5) * intensity * 2
      shakeY = (Math.random() - 0.5) * intensity * 2
    }

    ctx.clearRect(0, 0, this.width, this.height)
    ctx.translate(shakeX - camera.x, shakeY - camera.y)

    this.drawRoom()
    this.drawLoot(state.floor.loot)
    this.drawAttackArcs(state.attackArcs)
    this.drawEnemies(state.floor.enemies)
    this.drawHeroes(state.heroes, state.activeHeroIndex)
    this.drawProjectiles(state.projectiles)
    this.drawParticles(state.particles)
    this.drawDamageNumbers(state.damageNumbers)

    ctx.restore()

    // 传送门 (不受相机影响)
    if (state.floor.enemies.filter(e => !e.isDead).length === 0 && state.projectiles.length === 0) {
      // Portal drawing handled in HUD
    }
  }

  private drawRoom() {
    const ctx = this.ctx

    // 地板
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(WALL, WALL, ROOM_W - WALL * 2, ROOM_H - WALL * 2)

    // 地板网格
    ctx.strokeStyle = '#16213e'
    ctx.lineWidth = 1
    for (let x = WALL; x < ROOM_W - WALL; x += TILE_SIZE) {
      ctx.beginPath()
      ctx.moveTo(x, WALL)
      ctx.lineTo(x, ROOM_H - WALL)
      ctx.stroke()
    }
    for (let y = WALL; y < ROOM_H - WALL; y += TILE_SIZE) {
      ctx.beginPath()
      ctx.moveTo(WALL, y)
      ctx.lineTo(ROOM_W - WALL, y)
      ctx.stroke()
    }

    // 墙壁
    ctx.fillStyle = '#0f3460'
    ctx.fillRect(0, 0, ROOM_W, WALL)         // 上
    ctx.fillRect(0, ROOM_H - WALL, ROOM_W, WALL) // 下
    ctx.fillRect(0, 0, WALL, ROOM_H)          // 左
    ctx.fillRect(ROOM_W - WALL, 0, WALL, ROOM_H) // 右

    // 墙壁高光
    ctx.fillStyle = '#533483'
    ctx.fillRect(WALL - 2, WALL - 2, ROOM_W - WALL * 2 + 4, 2)
    ctx.fillRect(WALL - 2, WALL - 2, 2, ROOM_H - WALL * 2 + 4)
  }

  private drawHeroes(heroes: HeroState[], activeIdx: number) {
    for (let i = 0; i < heroes.length; i++) {
      const hero = heroes[i]
      if (hero.isDead) continue

      const ctx = this.ctx
      const isActive = i === activeIdx

      // 阴影
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(hero.x, hero.y + hero.def.size * 0.7, hero.def.size * 0.8, hero.def.size * 0.3, 0, 0, Math.PI * 2)
      ctx.fill()

      // 身体
      ctx.fillStyle = hero.def.color
      ctx.beginPath()
      ctx.arc(hero.x, hero.y, hero.def.size, 0, Math.PI * 2)
      ctx.fill()

      // 边框
      ctx.strokeStyle = isActive ? '#fff' : '#aaa'
      ctx.lineWidth = isActive ? 3 : 1
      ctx.stroke()

      // 英雄编号
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`${i + 1}`, hero.x, hero.y + 4)

      // 血条
      this.drawHealthBar(hero.x - 20, hero.y - hero.def.size - 10, 40, 5, hero.hp, hero.maxHp, '#2ecc71')

      // Buff图标
      if (hero.buffs.length > 0) {
        for (let j = 0; j < hero.buffs.length; j++) {
          const buff = hero.buffs[j]
          ctx.fillStyle = buff.color || '#fff'
          ctx.fillRect(hero.x - 15 + j * 8, hero.y - hero.def.size - 18, 6, 6)
        }
      }

      // 活跃指示器
      if (isActive) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.arc(hero.x, hero.y, hero.def.size + 5, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }
  }

  private drawEnemies(enemies: EnemyState[]) {
    const ctx = this.ctx
    for (const enemy of enemies) {
      if (enemy.isDead) continue

      // 阴影
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(enemy.x, enemy.y + enemy.def.size * 0.7, enemy.def.size * 0.7, enemy.def.size * 0.25, 0, 0, Math.PI * 2)
      ctx.fill()

      // 受击闪白：用白色绘制
      const isFlashing = enemy.hitFlash > 0
      const bodyColor = isFlashing ? '#fff' : enemy.def.color

      // 身体 - 方形(普通)或菱形(boss)
      if (enemy.def.isBoss) {
        ctx.fillStyle = bodyColor
        ctx.save()
        ctx.translate(enemy.x, enemy.y)
        ctx.rotate(Math.PI / 4)
        ctx.fillRect(-enemy.def.size * 0.7, -enemy.def.size * 0.7, enemy.def.size * 1.4, enemy.def.size * 1.4)
        ctx.restore()
      } else {
        ctx.fillStyle = bodyColor
        ctx.fillRect(enemy.x - enemy.def.size, enemy.y - enemy.def.size, enemy.def.size * 2, enemy.def.size * 2)
      }

      // 油瓶效果
      if (enemy.oilCovered) {
        ctx.fillStyle = 'rgba(121, 85, 72, 0.4)'
        ctx.beginPath()
        ctx.arc(enemy.x, enemy.y, enemy.def.size + 3, 0, Math.PI * 2)
        ctx.fill()
      }

      // 燃烧效果
      if (enemy.burnTimer > 0) {
        ctx.fillStyle = 'rgba(230, 126, 34, 0.4)'
        ctx.beginPath()
        ctx.arc(enemy.x, enemy.y, enemy.def.size + 2, 0, Math.PI * 2)
        ctx.fill()
      }

      // 眩晕效果
      if (enemy.stunTimer > 0) {
        ctx.fillStyle = '#ffd700'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('★', enemy.x, enemy.y - enemy.def.size - 5)
      }

      // 血条
      if (enemy.hp < enemy.maxHp) {
        this.drawHealthBar(enemy.x - 15, enemy.y - enemy.def.size - 8, 30, 4, enemy.hp, enemy.maxHp, '#e74c3c')
      }

      // Boss名称
      if (enemy.def.isBoss) {
        ctx.fillStyle = '#ffd700'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(enemy.def.name, enemy.x, enemy.y - enemy.def.size - 14)
      }
    }
  }

  private drawAttackArcs(arcs: AttackArc[]) {
    const ctx = this.ctx
    for (const arc of arcs) {
      const progress = 1 - arc.timer / arc.maxTimer
      const alpha = 1 - progress
      const sweepAngle = Math.PI * 0.6 * (0.3 + progress * 0.7) // 扫过角度逐渐增大
      const startAngle = arc.angle - sweepAngle / 2
      const endAngle = arc.angle + sweepAngle / 2

      // 弧光外圈
      ctx.globalAlpha = alpha * 0.8
      ctx.strokeStyle = arc.color
      ctx.lineWidth = 4 * (1 - progress)
      ctx.beginPath()
      ctx.arc(arc.x, arc.y, arc.radius * (0.8 + progress * 0.2), startAngle, endAngle)
      ctx.stroke()

      // 弧光内圈（白色）
      ctx.globalAlpha = alpha * 0.5
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2 * (1 - progress)
      ctx.beginPath()
      ctx.arc(arc.x, arc.y, arc.radius * (0.7 + progress * 0.2), startAngle, endAngle)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  private drawProjectiles(projectiles: Projectile[]) {
    const ctx = this.ctx
    for (const proj of projectiles) {
      ctx.fillStyle = proj.color
      ctx.beginPath()
      ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2)
      ctx.fill()

      // 拖尾
      ctx.fillStyle = proj.color + '40'
      ctx.beginPath()
      ctx.arc(proj.x - proj.vx * 2, proj.y - proj.vy * 2, proj.radius * 0.7, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private drawLoot(loot: LootDrop[]) {
    const ctx = this.ctx
    const time = Date.now()

    for (const drop of loot) {
      const bob = Math.sin(time * 0.003 + drop.id) * 3

      switch (drop.type) {
        case 'crystal':
          ctx.fillStyle = '#e1bee7'
          ctx.save()
          ctx.translate(drop.x, drop.y + bob)
          ctx.rotate(Math.PI / 4)
          ctx.fillRect(-5, -5, 10, 10)
          ctx.restore()
          // 发光
          ctx.fillStyle = 'rgba(225, 190, 231, 0.3)'
          ctx.beginPath()
          ctx.arc(drop.x, drop.y + bob, 12, 0, Math.PI * 2)
          ctx.fill()
          break
        case 'xp':
          ctx.fillStyle = '#64b5f6'
          ctx.beginPath()
          ctx.arc(drop.x, drop.y + bob, 6, 0, Math.PI * 2)
          ctx.fill()
          break
        case 'health':
          ctx.fillStyle = '#e74c3c'
          ctx.font = '14px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('+', drop.x, drop.y + bob + 5)
          break
        case 'item':
          if (drop.itemDef) {
            ctx.fillStyle = drop.itemDef.color
            ctx.beginPath()
            ctx.arc(drop.x, drop.y + bob, 10, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = '#fff'
            ctx.lineWidth = 2
            ctx.stroke()
            ctx.fillStyle = '#fff'
            ctx.font = 'bold 8px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText(drop.itemDef.name[0], drop.x, drop.y + bob + 3)
          }
          break
      }
    }
  }

  private drawParticles(particles: Particle[]) {
    const ctx = this.ctx
    for (const p of particles) {
      const alpha = p.life / p.maxLife
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  private drawDamageNumbers(numbers: DamageNumber[]) {
    const ctx = this.ctx
    for (const d of numbers) {
      const alpha = Math.min(1, d.timer / 400)
      ctx.globalAlpha = alpha
      ctx.fillStyle = d.color

      // 暴击数字更大更醒目
      const fontSize = d.isCrit ? 20 : 14
      ctx.font = `bold ${fontSize}px monospace`
      ctx.textAlign = 'center'

      // 描边效果
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 3
      ctx.strokeText(String(d.value), d.x, d.y)
      ctx.fillText(String(d.value), d.x, d.y)
    }
    ctx.globalAlpha = 1
  }

  private drawHealthBar(x: number, y: number, w: number, h: number, hp: number, maxHp: number, color: string) {
    const ctx = this.ctx
    const ratio = Math.max(0, hp / maxHp)
    ctx.fillStyle = '#333'
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = ratio > 0.5 ? color : ratio > 0.25 ? '#f39c12' : '#e74c3c'
    ctx.fillRect(x, y, w * ratio, h)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 0.5
    ctx.strokeRect(x, y, w, h)
  }

  drawPortal(x: number, y: number) {
    const ctx = this.ctx
    const time = Date.now() * 0.002
    ctx.save()
    ctx.translate(x, y)

    // 外圈
    ctx.strokeStyle = '#9b59b6'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(0, 0, 25 + Math.sin(time) * 3, 0, Math.PI * 2)
    ctx.stroke()

    // 内圈
    ctx.strokeStyle = '#3498db'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, 15 + Math.sin(time * 1.5) * 2, 0, Math.PI * 2)
    ctx.stroke()

    // 中心光效
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 20)
    gradient.addColorStop(0, 'rgba(155, 89, 182, 0.6)')
    gradient.addColorStop(1, 'rgba(155, 89, 182, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(0, 0, 20, 0, Math.PI * 2)
    ctx.fill()

    // 文字
    ctx.fillStyle = '#fff'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('传送门', 0, 40)

    ctx.restore()
  }
}
