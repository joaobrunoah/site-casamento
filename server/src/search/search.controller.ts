import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Controller()
export class SearchController {
  constructor(private firebaseService: FirebaseService) {}

  private async fetchGuestsForInvite(inviteId: string): Promise<any[]> {
    const db = this.firebaseService.getFirestore();
    const guestsSnapshot = await db
      .collection('guests')
      .where('inviteId', '==', inviteId)
      .get();

    return guestsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = [];

    for (let i = 0; i <= m; i++) {
      dp[i] = [i];
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + 1,
          );
        }
      }
    }

    return dp[m][n];
  }

  private calculateSimilarityScore(
    searchTerm: string,
    guestName: string,
  ): number {
    const normalizedSearch = this.normalizeText(searchTerm);
    const normalizedGuest = this.normalizeText(guestName);

    if (normalizedGuest === normalizedSearch) {
      return 100;
    }

    if (normalizedGuest.startsWith(normalizedSearch)) {
      const lengthRatio = normalizedSearch.length / normalizedGuest.length;
      return 90 + lengthRatio * 10;
    }

    if (normalizedGuest.includes(normalizedSearch)) {
      const lengthRatio = normalizedSearch.length / normalizedGuest.length;
      return 70 + lengthRatio * 20;
    }

    const searchWords = normalizedSearch.split(/\s+/).filter((w) => w.length > 0);
    const guestWords = normalizedGuest.split(/\s+/).filter((w) => w.length > 0);

    if (searchWords.length > 0 && guestWords.length > 0) {
      let matchedWords = 0;
      let totalWordScore = 0;

      for (const searchWord of searchWords) {
        let bestWordScore = 0;
        for (const guestWord of guestWords) {
          if (guestWord === searchWord) {
            bestWordScore = 100;
            break;
          } else if (guestWord.startsWith(searchWord)) {
            bestWordScore = Math.max(bestWordScore, 80);
          } else if (guestWord.includes(searchWord)) {
            bestWordScore = Math.max(bestWordScore, 60);
          } else {
            const distance = this.levenshteinDistance(searchWord, guestWord);
            const maxLen = Math.max(searchWord.length, guestWord.length);
            if (maxLen > 0) {
              const similarity = (1 - distance / maxLen) * 100;
              bestWordScore = Math.max(bestWordScore, similarity);
            }
          }
        }
        if (bestWordScore > 40) {
          matchedWords++;
          totalWordScore += bestWordScore;
        }
      }

      if (matchedWords > 0) {
        const avgWordScore = totalWordScore / searchWords.length;
        const coverageRatio = matchedWords / searchWords.length;
        return avgWordScore * coverageRatio;
      }
    }

    const distance = this.levenshteinDistance(normalizedSearch, normalizedGuest);
    const maxLen = Math.max(normalizedSearch.length, normalizedGuest.length);
    if (maxLen === 0) return 0;

    const similarity = (1 - distance / maxLen) * 100;
    return similarity >= 50 ? similarity : 0;
  }

  @Get('searchInvitesByGuestName')
  async searchInvitesByGuestName(@Query('name') name: string) {
    try {
      if (!name || name.trim() === '') {
        throw new HttpException(
          'Guest name is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const db = this.firebaseService.getFirestore();
      const invitesSnapshot = await db.collection('invites').get();
      const invitesWithGuests = await Promise.all(
        invitesSnapshot.docs.map(async (doc) => {
          const inviteData = doc.data();
          const guests = await this.fetchGuestsForInvite(doc.id);
          return {
            id: doc.id,
            ...inviteData,
            guests: guests.map(({ inviteId, ...guestData }) => guestData),
          };
        }),
      );

      const searchTerm = name.trim();
      const matches: Array<{ invite: any; guest: any; score: number }> = [];

      invitesWithGuests.forEach((invite) => {
        invite.guests.forEach((guest: any) => {
          const guestName = guest.nome || '';
          if (guestName.trim() === '') return;

          const score = this.calculateSimilarityScore(searchTerm, guestName);

          if (score >= 40) {
            matches.push({
              invite,
              guest,
              score,
            });
          }
        });
      });

      matches.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return (a.guest.nome || '').length - (b.guest.nome || '').length;
      });

      if (matches.length === 0) {
        return { success: false, message: 'Nenhum convite encontrado' };
      }

      const bestMatch = matches[0];
      console.log('Best match found', {
        searchTerm,
        matchedGuest: bestMatch.guest.nome,
        score: bestMatch.score,
        totalMatches: matches.length,
      });

      return {
        success: true,
        invite: bestMatch.invite,
        matchedGuest: bestMatch.guest,
      };
    } catch (error) {
      console.error('Error searching invites', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to search invites',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
