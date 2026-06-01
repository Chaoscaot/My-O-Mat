import { type Doc } from "@/convex/_generated/dataModel"
import { type AnswerState, type AnswerValue, type Stance } from "./types"

function stanceScore(value: Stance | AnswerValue) {
  if (value === "yes") return 1
  if (value === "no") return -1
  return 0
}

export function scoreParties<TParty extends Doc<"parties">>(
  parties: TParty[],
  questions: Doc<"questions">[],
  positions: Doc<"partyPositions">[],
  answers: AnswerState
) {
  return parties
    .map((party) => {
      let distance = 0
      let maxDistance = 0
      for (const question of questions) {
        const answer = answers[question._id]
        if (!answer || answer.value === "skip") continue
        const position = positions.find(
          (item) =>
            item.partyId === party._id && item.questionId === question._id
        )
        if (!position) continue
        const weight = answer.doubled ? 2 : 1
        distance +=
          Math.abs(stanceScore(answer.value) - stanceScore(position.stance)) *
          weight
        maxDistance += 2 * weight
      }
      const match =
        maxDistance === 0 ? 0 : Math.round((1 - distance / maxDistance) * 100)
      return { party, match }
    })
    .sort((a, b) => b.match - a.match)
}
